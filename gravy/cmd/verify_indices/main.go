package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/pranava-mohan/wikinitt/gravy/internal/db"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, assuming env vars are set")
	}

	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI environment variable is required")
	}

	// Replace "mongodb" host with "localhost" for running outside docker
	mongoURI = strings.Replace(mongoURI, "mongodb://mongodb", "mongodb://localhost", 1)

	client, err := db.Connect(mongoURI)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer func() {
		if err := client.Disconnect(context.Background()); err != nil {
			log.Printf("Error disconnecting: %v", err)
		}
	}()

	database := client.Database("wikinitt")
	collections := []string{"users", "groups", "posts", "comments", "votes", "commentVotes", "discussions", "channels", "messages", "articles"}

	for _, collName := range collections {
		coll := database.Collection(collName)
		cursor, err := coll.Indexes().List(context.Background())
		if err != nil {
			log.Printf("Failed to list indexes for %s: %v", collName, err)
			continue
		}

		var results []bson.M
		if err := cursor.All(context.Background(), &results); err != nil {
			log.Printf("Failed to decode indexes for %s: %v", collName, err)
			continue
		}

		fmt.Printf("Indexes for %s:\n", collName)
		for _, index := range results {
			fmt.Printf(" - %v\n", index["key"])
		}
		fmt.Println("------------------------------------------------")
	}
}
