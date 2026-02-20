package rag

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/pranava-mohan/wikinitt/gravy/internal/articles"
	"github.com/redis/go-redis/v9"
)

type EventType string

const (
	EventTypeCreate EventType = "create"
	EventTypeUpdate EventType = "update"
	EventTypeDelete EventType = "delete"
	RagQueueKey               = "rag_update_queue"
)

type RagEvent struct {
	Type            EventType `json:"type"`
	ArticleID       string    `json:"article_id"`
	Title           string    `json:"title,omitempty"`
	ContentMarkdown string    `json:"content_markdown,omitempty"`
	Slug            string    `json:"slug,omitempty"`
	SourceURL       string    `json:"source_url,omitempty"`
}

type Client interface {
	PushEvent(ctx context.Context, event RagEvent) error
}

type RedisClient struct {
	rdb *redis.Client
}

func NewRedisClient(addr string, password string) *RedisClient {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password, // no password set
		DB:       0,        // use default DB
	})

	return &RedisClient{rdb: rdb}
}

func (c *RedisClient) PushEvent(ctx context.Context, event RagEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	return c.rdb.LPush(ctx, RagQueueKey, data).Err()
}

// ConvertArticleToEvent helper
func ArticleToEvent(eventType EventType, article *articles.Article) RagEvent {
	// Construct source URL based on slug
	// Assuming frontend URL structure, ideally this should be configurable or passed in
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://wikinitt.netlify.app"
	}
	sourceURL := fmt.Sprintf("%s/wiki/%s", frontendURL, article.Slug)

	return RagEvent{
		Type:            eventType,
		ArticleID:       article.ID,
		Title:           article.Title,
		ContentMarkdown: article.Content,
		Slug:            article.Slug,
		SourceURL:       sourceURL,
	}
}
