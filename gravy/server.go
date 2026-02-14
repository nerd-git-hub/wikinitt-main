package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/joho/godotenv"
	"github.com/pranava-mohan/wikinitt/gravy/graph"
	"github.com/pranava-mohan/wikinitt/gravy/graph/model"
	"github.com/pranava-mohan/wikinitt/gravy/internal/articles"
	"github.com/pranava-mohan/wikinitt/gravy/internal/auth"
	"github.com/pranava-mohan/wikinitt/gravy/internal/categories"
	"github.com/pranava-mohan/wikinitt/gravy/internal/community"
	"github.com/pranava-mohan/wikinitt/gravy/internal/db"
	"github.com/pranava-mohan/wikinitt/gravy/internal/maplocation"
	"github.com/pranava-mohan/wikinitt/gravy/internal/ratelimit"
	"github.com/pranava-mohan/wikinitt/gravy/internal/search"
	"github.com/pranava-mohan/wikinitt/gravy/internal/uploader"
	"github.com/pranava-mohan/wikinitt/gravy/internal/users"
	"github.com/rs/cors"
	"golang.org/x/time/rate"
)

const defaultPort = "8080"

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI environment variable is required")
	}

	dbClient, err := db.Connect(mongoURI)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	database := dbClient.Database("wikinitt")

	meiliHost := os.Getenv("MEILI_HOST")
	if meiliHost == "" {
		meiliHost = "http://localhost:7700"
	}
	meiliKey := os.Getenv("MEILI_MASTER_KEY")
	if meiliKey == "" {
		meiliKey = "blablablablablablablablablablablablabla"
	}
	searchClient := search.NewClient(meiliHost, meiliKey)

	userRepo := users.NewRepository(database)
	articleRepo := articles.NewRepository(database, searchClient)
	categoryRepo := categories.NewRepository(database)
	communityRepo := community.NewRepository(database, searchClient)
	mapLocationRepo := maplocation.NewRepository(database)

	ctx := context.Background()
	if err := userRepo.EnsureIndexes(ctx); err != nil {
		log.Printf("Failed to create user indexes: %v", err)
	}
	if err := articleRepo.EnsureIndexes(ctx); err != nil {
		log.Printf("Failed to create article indexes: %v", err)
	}
	if err := communityRepo.EnsureIndexes(ctx); err != nil {
		log.Printf("Failed to create community indexes: %v", err)
	}

	cldName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	cldKey := os.Getenv("CLOUDINARY_API_KEY")
	cldSecret := os.Getenv("CLOUDINARY_API_SECRET")

	if cldName == "" || cldKey == "" || cldSecret == "" {
		log.Fatal("CLOUDINARY credentials are required")
	}

	uploaderService, err := uploader.NewUploader(cldName, cldKey, cldSecret)
	if err != nil {
		log.Fatalf("Failed to create Cloudinary uploader: %v", err)
	}

	go func() {
		log.Println("Starting Meilisearch indexing...")
		if err := searchClient.CreateIndexes(); err != nil {
			log.Printf("Failed to create indexes: %v", err)
		}

		ctx := context.Background()
		batchSize := 1000

		for {
			unindexedArticles, err := articleRepo.ListUnindexed(ctx, batchSize)
			if err != nil {
				log.Printf("Failed to fetch unindexed articles: %v", err)
				break
			}
			if len(unindexedArticles) == 0 {
				break
			}

			docs := make([]interface{}, len(unindexedArticles))
			for i, a := range unindexedArticles {
				docs[i] = map[string]interface{}{
					"id":        a.ID,
					"title":     a.Title,
					"content":   a.Content,
					"slug":      a.Slug,
					"category":  a.Category,
					"thumbnail": a.Thumbnail,
					"authorID":  a.AuthorID,
					"createdAt": a.CreatedAt.Unix(),
				}
			}
			if err := searchClient.IndexArticles(ctx, docs); err != nil {
				log.Printf("Failed to index articles batch: %v", err)
			} else {
				count := 0
				for _, a := range unindexedArticles {
					if err := articleRepo.MarkIndexed(ctx, a.ID); err == nil {
						count++
					}
				}
				log.Printf("Indexed %d articles", count)
			}
		}

		for {
			unindexedGroups, err := communityRepo.ListUnindexedGroups(ctx, batchSize)
			if err != nil {
				log.Printf("Failed to fetch unindexed groups: %v", err)
				break
			}
			if len(unindexedGroups) == 0 {
				break
			}

			var groupDocs []interface{}
			for _, g := range unindexedGroups {
				groupDocs = append(groupDocs, map[string]interface{}{
					"id":           g.ID,
					"type":         "group",
					"group_id":     g.ID,
					"group_type":   string(g.Type),
					"name":         g.Name,
					"description":  g.Description,
					"slug":         g.Slug,
					"ownerId":      g.OwnerID,
					"createdAt":    g.CreatedAt.Unix(),
					"membersCount": g.MembersCount,
				})
			}

			if err := searchClient.IndexCommunity(ctx, groupDocs); err != nil {
				log.Printf("Failed to index groups batch: %v", err)
			} else {
				count := 0
				for _, g := range unindexedGroups {
					if err := communityRepo.MarkGroupIndexed(ctx, g.ID); err == nil {
						count++
					}
				}
				log.Printf("Indexed %d groups", count)
			}
		}

		for {
			unindexedPosts, err := communityRepo.ListUnindexedPosts(ctx, batchSize)
			if err != nil {
				log.Printf("Failed to fetch unindexed posts: %v", err)
				break
			}
			if len(unindexedPosts) == 0 {
				break
			}

			var groupIDs []string
			for _, p := range unindexedPosts {
				groupIDs = append(groupIDs, p.GroupID)
			}
			groups, err := communityRepo.GetGroupsByIDs(ctx, groupIDs)
			groupTypeMap := make(map[string]string)
			if err == nil {
				for _, g := range groups {
					groupTypeMap[g.ID] = string(g.Type)
				}
			}

			var postDocs []interface{}
			for _, p := range unindexedPosts {
				gType, _ := groupTypeMap[p.GroupID]

				postDocs = append(postDocs, map[string]interface{}{
					"id":         p.ID,
					"type":       "post",
					"group_id":   p.GroupID,
					"group_type": gType,
					"title":      p.Title,
					"content":    p.Content,
					"authorId":   p.AuthorID,
					"createdAt":  p.CreatedAt.Unix(),
				})
			}

			if len(postDocs) > 0 {
				if err := searchClient.IndexCommunity(ctx, postDocs); err != nil {
					log.Printf("Failed to index posts batch: %v", err)
				} else {
					count := 0
					for _, p := range unindexedPosts {
						if _, ok := groupTypeMap[p.GroupID]; ok {
							if err := communityRepo.MarkPostIndexed(ctx, p.ID); err == nil {
								count++
							}
						}
					}
					log.Printf("Indexed %d posts", count)
				}
			} else {
				for _, p := range unindexedPosts {
					_ = communityRepo.MarkPostIndexed(ctx, p.ID)
				}
			}
		}

		for {
			unindexedComments, err := communityRepo.ListUnindexedComments(ctx, batchSize)
			if err != nil {
				log.Printf("Failed to fetch unindexed comments: %v", err)
				break
			}
			if len(unindexedComments) == 0 {
				break
			}

			var postIDs []string
			for _, c := range unindexedComments {
				postIDs = append(postIDs, c.PostID)
			}
			relatedPosts, err := communityRepo.GetPostsByIDs(ctx, postIDs)
			postGroupMap := make(map[string]string) // PostID -> GroupID
			var groupIDs []string
			if err == nil {
				for _, p := range relatedPosts {
					postGroupMap[p.ID] = p.GroupID
					groupIDs = append(groupIDs, p.GroupID)
				}
			}

			relatedGroups, err := communityRepo.GetGroupsByIDs(ctx, groupIDs)
			groupTypeMap := make(map[string]string) // GroupID -> Type
			if err == nil {
				for _, g := range relatedGroups {
					groupTypeMap[g.ID] = string(g.Type)
				}
			}

			var commentDocs []interface{}
			for _, c := range unindexedComments {
				groupID, okMeta := postGroupMap[c.PostID]
				if !okMeta {
					continue
				}
				gType, okType := groupTypeMap[groupID]
				if !okType {
					continue
				}

				commentDocs = append(commentDocs, map[string]interface{}{
					"id":         c.ID,
					"type":       "comment",
					"group_id":   groupID,
					"group_type": gType,
					"content":    c.Content,
					"authorId":   c.AuthorID,
					"postId":     c.PostID,
					"parentId":   c.ParentID,
					"createdAt":  c.CreatedAt.Unix(),
				})
			}

			if len(commentDocs) > 0 {
				if err := searchClient.IndexCommunity(ctx, commentDocs); err != nil {
					log.Printf("Failed to index comments batch: %v", err)
				} else {
					count := 0
					for _, c := range unindexedComments {
						if _, ok := postGroupMap[c.PostID]; ok {
							if err := communityRepo.MarkCommentIndexed(ctx, c.ID); err == nil {
								count++
							}
						}
					}
					log.Printf("Indexed %d comments", count)
				}
			} else {
				for _, c := range unindexedComments {
					_ = communityRepo.MarkCommentIndexed(ctx, c.ID)
				}
			}
		}

		log.Println("Meilisearch indexing reference complete.")
	}()

	c := graph.Config{
		Resolvers: &graph.Resolver{
			UserRepo:        userRepo,
			ArticleRepo:     articleRepo,
			CategoryRepo:    categoryRepo,
			CommunityRepo:   communityRepo,
			MapLocationRepo: mapLocationRepo,
			Uploader:        uploaderService,
			SearchClient:    searchClient,
		},
	}
	c.Directives.Auth = func(ctx context.Context, obj interface{}, next graphql.Resolver, requires *model.Role) (interface{}, error) {
		user := auth.ForContext(ctx)
		if user == nil {
			return nil, fmt.Errorf("access denied: not authenticated")
		}

		if requires != nil && *requires == model.RoleAdmin && !user.IsAdmin {
			return nil, fmt.Errorf("access denied: admins only")
		}

		return next(ctx)
	}

	srv := handler.NewDefaultServer(graph.NewExecutableSchema(c))

	isProduction := strings.ToLower(os.Getenv("GO_ENV")) == "production"

	var allowedOrigins []string
	if isProduction {
		allowedOrigins = []string{"https://wikinitt.netlify.app"}
		log.Println("Running in PRODUCTION mode")
	} else {
		allowedOrigins = []string{"http://localhost:3000", "http://127.0.0.1:3000", "https://wikinitt.netlify.app"}
		log.Println("Running in DEVELOPMENT mode")
	}

	corsMiddleware := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	mux := http.NewServeMux()

	if isProduction {
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"message":"GraphQL API available at /query"}`))
		})
	} else {
		mux.Handle("/", playground.Handler("GraphQL playground", "/query"))
		log.Printf("GraphQL playground available at http://localhost:%s/", port)
	}

	mux.Handle("/query", auth.Middleware(userRepo)(srv))

	var finalHandler http.Handler = mux

	finalHandler = corsMiddleware.Handler(finalHandler)

	if isProduction {
		rateLimiter := ratelimit.NewIPRateLimiter(rate.Limit(10), 20)
		finalHandler = ratelimit.Middleware(rateLimiter)(finalHandler)

		finalHandler = http.TimeoutHandler(finalHandler, 30*time.Second, `{"errors":[{"message":"Request timeout"}]}`)

		finalHandler = recoveryMiddleware(finalHandler)
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, finalHandler))
}

func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("Panic recovered: %v", err)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(`{"errors":[{"message":"Internal server error"}]}`))
			}
		}()
		next.ServeHTTP(w, r)
	})
}
