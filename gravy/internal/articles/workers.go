package articles

import (
	"context"
	"log"
	"regexp"
	"strings"
	"sync"
)

const WorkerCount = 4

// Entry point called from resolver
func StartBacklinkWorkers(
	ctx context.Context,
	repo Repository,
	newTitle string,
	newSlug string,
	newArticleID string,
) {
	log.Println("=== BACKLINK WORKERS STARTED ===")
	log.Println("New title:", newTitle)
	log.Println("New slug:", newSlug)
	log.Println("New article ID:", newArticleID)

	go runWorkers(ctx, repo, newTitle, newSlug, newArticleID)
}

func runWorkers(
	ctx context.Context,
	repo Repository,
	newTitle string,
	newSlug string,
	currentArticleID string,
) {

	total, err := repo.CountArticles(ctx)
	if err != nil {
		log.Println("ERROR counting articles:", err)
		return
	}

	if total == 0 {
		log.Println("No articles exist. Nothing to process.")
		return
	}

	chunkSize := total / int64(WorkerCount)
	if chunkSize == 0 {
		chunkSize = total
	}

	log.Println("Total articles:", total)
	log.Println("Worker count:", WorkerCount)
	log.Println("Chunk size:", chunkSize)

	var wg sync.WaitGroup

	for i := 0; i < WorkerCount; i++ {

		skip := int64(i) * chunkSize
		limit := chunkSize

		// last worker takes remainder
		if i == WorkerCount-1 {
			limit = total - skip
		}

		if skip >= total {
			break
		}

		log.Println("Launching worker", i, "skip:", skip, "limit:", limit)

		wg.Add(1)

		go func(workerID int, skip, limit int64) {
			defer wg.Done()

			processChunk(
				ctx,
				repo,
				newTitle,
				newSlug,
				currentArticleID,
				skip,
				limit,
				workerID,
			)

		}(i, skip, limit)
	}

	wg.Wait()

	log.Println("=== ALL WORKERS FINISHED ===")
}

func processChunk(
	ctx context.Context,
	repo Repository,
	title string,
	slug string,
	currentArticleID string,
	skip int64,
	limit int64,
	workerID int,
) {

	log.Println("[Worker", workerID, "] Processing chunk skip:", skip, "limit:", limit)

	articles, err := repo.GetArticlesChunk(ctx, skip, limit)
	if err != nil {
		log.Println("[Worker", workerID, "] ERROR fetching chunk:", err)
		return
	}

	log.Println("[Worker", workerID, "] Articles fetched:", len(articles))

	for _, article := range articles {

		log.Println("[Worker", workerID, "] Checking article:", article.ID)

		// skip the article itself
		if article.ID == currentArticleID {
			log.Println("[Worker", workerID, "] Skipping self")
			continue
		}

		log.Println("[Worker", workerID, "] Original content:", article.Content)

		updated := linkSingleTitle(article.Content, title, slug)

		if updated != article.Content {

			log.Println("[Worker", workerID, "] MATCH FOUND — updating article:", article.ID)

			err := repo.UpdateContent(ctx, article.ID, updated)
			if err != nil {
				log.Println("[Worker", workerID, "] UPDATE ERROR:", err)
			} else {
				log.Println("[Worker", workerID, "] UPDATE SUCCESS:", article.ID)
			}

		} else {

			log.Println("[Worker", workerID, "] No match in article:", article.ID)

		}
	}

	log.Println("[Worker", workerID, "] Finished chunk")
}

func linkSingleTitle(content, title, slug string) string {

	// case-insensitive whole word match
	pattern := `(?i)\b` + regexp.QuoteMeta(title) + `\b`
	re := regexp.MustCompile(pattern)

	return re.ReplaceAllStringFunc(content, func(match string) string {

		// prevent duplicate linking
		if strings.Contains(match, "("+slug+")") {
			return match
		}

		log.Println("LINKING:", match, "->", slug)

		return "[" + match + "](" + slug + ")"
	})
}
