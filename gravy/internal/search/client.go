package search

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/meilisearch/meilisearch-go"
)

type Client struct {
	client meilisearch.ServiceManager
}

func NewClient(host, key string) *Client {
	client := meilisearch.New(host, meilisearch.WithAPIKey(key))
	return &Client{client: client}
}

func (c *Client) CreateIndexes() error {
	// Create articles index
	_, err := c.client.CreateIndex(&meilisearch.IndexConfig{
		Uid:        "articles",
		PrimaryKey: "id",
	})
	if err != nil {
		// Log error but continue as index might already exist
		log.Printf("Error creating articles index (might exist): %v", err)
	}

	// Create community index
	_, err = c.client.CreateIndex(&meilisearch.IndexConfig{
		Uid:        "community",
		PrimaryKey: "id",
	})
	if err != nil {
		log.Printf("Error creating community index (might exist): %v", err)
	}

	filterableAttributes := []string{"group_type", "group_id", "type", "postId"}

	attrs := make([]interface{}, len(filterableAttributes))
	for i, v := range filterableAttributes {
		attrs[i] = v
	}

	task, err := c.client.Index("community").UpdateFilterableAttributes(&attrs)
	if err != nil {
		return fmt.Errorf("failed to update filterable attributes for community: %w", err)
	}
	log.Printf("Update filterable attributes task: %v", task.TaskUID)

	return nil
}

func (c *Client) IndexArticles(ctx context.Context, documents interface{}) error {
	primaryKey := "id"
	task, err := c.client.Index("articles").AddDocuments(documents, &meilisearch.DocumentOptions{PrimaryKey: &primaryKey})
	if err != nil {
		return fmt.Errorf("failed to add documents to articles index: %w", err)
	}
	log.Printf("Index articles task: %v", task.TaskUID)
	return nil
}

func (c *Client) IndexCommunity(ctx context.Context, documents interface{}) error {
	primaryKey := "id"
	task, err := c.client.Index("community").AddDocuments(documents, &meilisearch.DocumentOptions{PrimaryKey: &primaryKey})
	if err != nil {
		return fmt.Errorf("failed to add documents to community index: %w", err)
	}
	log.Printf("Index community task: %v", task.TaskUID)
	return nil
}

func (c *Client) IndexArticle(ctx context.Context, doc interface{}) error {
	primaryKey := "id"
	task, err := c.client.Index("articles").AddDocuments([]interface{}{doc}, &meilisearch.DocumentOptions{PrimaryKey: &primaryKey})
	if err != nil {
		return fmt.Errorf("failed to index article: %w", err)
	}
	log.Printf("Index article task: %v", task.TaskUID)
	return nil
}

func (c *Client) DeleteArticle(ctx context.Context, id string) error {
	task, err := c.client.Index("articles").DeleteDocument(id, nil)
	if err != nil {
		return fmt.Errorf("failed to delete article: %w", err)
	}
	log.Printf("Delete article task: %v", task.TaskUID)
	return nil
}

func (c *Client) IndexGroup(ctx context.Context, doc interface{}) error {
	primaryKey := "id"
	task, err := c.client.Index("community").AddDocuments([]interface{}{doc}, &meilisearch.DocumentOptions{PrimaryKey: &primaryKey})
	if err != nil {
		return fmt.Errorf("failed to index group: %w", err)
	}
	log.Printf("Index group task: %v", task.TaskUID)
	return nil
}

func (c *Client) DeleteGroup(ctx context.Context, id string) error {
	task, err := c.client.Index("community").DeleteDocument(id, nil)
	if err != nil {
		return fmt.Errorf("failed to delete group: %w", err)
	}
	log.Printf("Delete group task: %v", task.TaskUID)
	return nil
}

func (c *Client) IndexPost(ctx context.Context, doc interface{}) error {
	primaryKey := "id"
	task, err := c.client.Index("community").AddDocuments([]interface{}{doc}, &meilisearch.DocumentOptions{PrimaryKey: &primaryKey})
	if err != nil {
		return fmt.Errorf("failed to index post: %w", err)
	}
	log.Printf("Index post task: %v", task.TaskUID)
	return nil
}

func (c *Client) DeletePost(ctx context.Context, id string) error {
	task, err := c.client.Index("community").DeleteDocument(id, nil)
	if err != nil {
		return fmt.Errorf("failed to delete post: %w", err)
	}
	log.Printf("Delete post task: %v", task.TaskUID)
	return nil
}

func (c *Client) IndexComment(ctx context.Context, doc interface{}) error {
	primaryKey := "id"
	task, err := c.client.Index("community").AddDocuments([]interface{}{doc}, &meilisearch.DocumentOptions{PrimaryKey: &primaryKey})
	if err != nil {
		return fmt.Errorf("failed to index comment: %w", err)
	}
	log.Printf("Index comment task: %v", task.TaskUID)
	return nil
}

func (c *Client) DeleteComment(ctx context.Context, id string) error {
	task, err := c.client.Index("community").DeleteDocument(id, nil)
	if err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}
	log.Printf("Delete comment task: %v", task.TaskUID)
	return nil
}

func (c *Client) DeleteCommunityDataByGroupID(ctx context.Context, groupID string) error {
	filter := fmt.Sprintf("group_id = '%s'", groupID)
	task, err := c.client.Index("community").DeleteDocumentsByFilter(filter, nil)
	if err != nil {
		return fmt.Errorf("failed to delete community data for group %s: %w", groupID, err)
	}
	log.Printf("Delete community data (group %s) task: %v", groupID, task.TaskUID)
	return nil
}

func (c *Client) DeleteCommunityDataByPostID(ctx context.Context, postID string) error {
	filter := fmt.Sprintf("id = '%s' OR postId = '%s'", postID, postID)
	task, err := c.client.Index("community").DeleteDocumentsByFilter(filter, nil)
	if err != nil {
		return fmt.Errorf("failed to delete community data for post %s: %w", postID, err)
	}
	log.Printf("Delete community data (post %s) task: %v", postID, task.TaskUID)
	return nil
}

func (c *Client) SearchArticles(ctx context.Context, query string, limit, offset int) ([]string, error) {
	searchRes, err := c.client.Index("articles").Search(query, &meilisearch.SearchRequest{
		Limit:  int64(limit),
		Offset: int64(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("search articles failed: %w", err)
	}

	ids := make([]string, len(searchRes.Hits))
	for i, hit := range searchRes.Hits {
		var hitMap map[string]interface{}
		b, _ := json.Marshal(hit)
		_ = json.Unmarshal(b, &hitMap)

		if id, ok := hitMap["id"].(string); ok {
			ids[i] = id
		}
	}
	return ids, nil
}

func (c *Client) SearchPosts(ctx context.Context, query string, limit, offset int) ([]string, error) {
	searchRes, err := c.client.Index("community").Search(query, &meilisearch.SearchRequest{
		Limit:  int64(limit),
		Offset: int64(offset),
		Filter: "type = post AND group_type = 'PUBLIC'",
	})
	if err != nil {
		return nil, fmt.Errorf("search posts failed: %w", err)
	}

	ids := make([]string, len(searchRes.Hits))
	for i, hit := range searchRes.Hits {
		var hitMap map[string]interface{}
		b, _ := json.Marshal(hit)
		_ = json.Unmarshal(b, &hitMap)

		if id, ok := hitMap["id"].(string); ok {
			ids[i] = id
		}
	}
	return ids, nil
}

type SearchHit struct {
	ID   string
	Type string
}

func (c *Client) SearchCommunity(ctx context.Context, query string, limit, offset int) ([]SearchHit, error) {
	searchRes, err := c.client.Index("community").Search(query, &meilisearch.SearchRequest{
		Limit:  int64(limit),
		Offset: int64(offset),
		Filter: "group_type = 'PUBLIC'",
	})
	if err != nil {
		return nil, fmt.Errorf("search community failed: %w", err)
	}

	var hits []SearchHit
	for _, hit := range searchRes.Hits {
		var hitMap map[string]interface{}
		b, _ := json.Marshal(hit)
		_ = json.Unmarshal(b, &hitMap)

		id, okID := hitMap["id"].(string)
		typeStr, okType := hitMap["type"].(string)

		if okID && okType {
			hits = append(hits, SearchHit{
				ID:   id,
				Type: typeStr,
			})
		}
	}
	return hits, nil
}
