package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/pranava-mohan/wikinitt/gravy/internal/auth"
	"github.com/pranava-mohan/wikinitt/gravy/internal/db"
	"github.com/pranava-mohan/wikinitt/gravy/internal/uploader"
	"github.com/pranava-mohan/wikinitt/gravy/internal/users"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"
)

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func main() {

	email := flag.String("email", "", "Email for the new admin user (required)")
	password := flag.String("password", "", "Password for the new admin user (required)")
	username := flag.String("username", "", "Username for the new admin user (required)")
	name := flag.String("name", "Admin User", "Name for the new admin user")

	flag.Parse()

	if *email == "" || *password == "" || *name == "" {
		log.Println("Error: --email, --password and --name flags are required.")
		flag.Usage()
		return
	}

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI environment variable is required")
	}

	client, err := db.Connect(mongoURI)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	userCollection := client.Database("wikinitt").Collection("users")

	var existingUser users.User
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err = userCollection.FindOne(ctx, bson.M{"email": *email}).Decode(&existingUser)

	if err == nil {
		log.Fatalf("User with email %s already exists", *email)
	} else if err != mongo.ErrNoDocuments {
		log.Fatalf("Error checking for existing user: %v", err)
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

	hashedPassword, err := hashPassword(*password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	tempID := fmt.Sprintf("admin_%d", time.Now().Unix())
	avatarURL, err := auth.AvatarGenerationAndCleanup(tempID, uploaderService)
	if err != nil {
		log.Printf("Warning: unable to upload avatar image: %v. Using default.", err)
		avatarURL = ""
	}

	newUser := users.User{

		Email:         *email,
		Username:      *username,
		PasswordHash:  hashedPassword,
		IsAdmin:       true,
		Name:          *name,
		DisplayName:   *name,
		Avatar:        avatarURL,
		CreatedAt:     time.Now(),
		OAuthID:       "admin_" + *email,
		Gender:        "Unspecified",
		PhoneNumber:   "",
		IsBanned:      false,
		SetupComplete: true,
	}

	_, insertErr := userCollection.InsertOne(ctx, newUser)
	if insertErr != nil {
		log.Fatalf("Failed to create admin user: %v", insertErr)
	}

	fmt.Printf("✅ Successfully created admin user!\n")
	fmt.Printf("   Email: %s\n", newUser.Email)
	fmt.Printf("   Name:  %s\n", newUser.Name)
}
