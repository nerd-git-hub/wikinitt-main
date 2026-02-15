package users

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type User struct {
	ID          string `bson:"_id,omitempty"`
	Name        string `bson:"name"`
	Username    string `bson:"username"`
	DisplayName string `bson:"displayName"`
	Email       string `bson:"email"`
	Gender      string `bson:"gender"`
	Avatar      string `bson:"avatar"`
	PhoneNumber string `bson:"phoneNumber"`

	OAuthID       string    `bson:"oauthId"`
	PasswordHash  string    `bson:"passwordHash"`
	SetupComplete bool      `bson:"setupComplete"`
	IsAdmin       bool      `bson:"isAdmin"`
	IsBanned      bool      `bson:"isBanned"`
	CreatedAt     time.Time `bson:"createdAt"`
}

type PublicUser struct {
	ID          string `bson:"_id"`
	Name        string `bson:"name"`
	Username    string `bson:"username"`
	DisplayName string `bson:"displayName"`
	Gender      string `bson:"gender"`
	Avatar      string `bson:"avatar"`
}

type Repository interface {
	Create(ctx context.Context, user *User) error
	GetByOAuthID(ctx context.Context, oauthID string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByUsername(ctx context.Context, username string) (*User, error)
	List(ctx context.Context) ([]*User, error)
	Block(ctx context.Context, id string) error
	Unblock(ctx context.Context, id string) error
	CompleteSetup(ctx context.Context, id, username, displayName string) error
	Update(ctx context.Context, id string, updates map[string]interface{}) (*User, error)
	EnsureIndexes(ctx context.Context) error
}

type repository struct {
	coll *mongo.Collection
}

func NewRepository(db *mongo.Database) Repository {
	return &repository{
		coll: db.Collection("users"),
	}
}

func (r *repository) Create(ctx context.Context, user *User) error {
	res, err := r.coll.InsertOne(ctx, user)
	if err != nil {
		return err
	}
	if oid, ok := res.InsertedID.(bson.ObjectID); ok {
		user.ID = oid.Hex()
	}
	return nil
}

func (r *repository) GetByOAuthID(ctx context.Context, oauthID string) (*User, error) {
	var user User
	err := r.coll.FindOne(ctx, bson.M{"oauthId": oauthID}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) GetByID(ctx context.Context, id string) (*User, error) {
	var user User
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	err = r.coll.FindOne(ctx, bson.M{"_id": oid}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) GetByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	err := r.coll.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) GetByUsername(ctx context.Context, username string) (*User, error) {
	var user User
	err := r.coll.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) List(ctx context.Context) ([]*User, error) {
	cursor, err := r.coll.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	var users []*User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}
	return users, nil
}

func (r *repository) Block(ctx context.Context, id string) error {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.coll.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"isBanned": true}})
	return err
}

func (r *repository) Unblock(ctx context.Context, id string) error {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.coll.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"isBanned": false}})
	return err
}

func (r *repository) CompleteSetup(ctx context.Context, id, username, displayName string) error {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.coll.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{
		"username":      username,
		"displayName":   displayName,
		"setupComplete": true,
	}})
	return err
}

func (r *repository) Update(ctx context.Context, id string, updates map[string]interface{}) (*User, error) {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	update := bson.M{"$set": updates}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updatedUser User
	err = r.coll.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&updatedUser)
	if err != nil {
		return nil, err
	}
	return &updatedUser, nil
}

func (r *repository) EnsureIndexes(ctx context.Context) error {
	indices := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "oauthId", Value: 1}},
			Options: options.Index().SetUnique(true).SetSparse(true),
		},
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "username", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	}

	_, err := r.coll.Indexes().CreateMany(ctx, indices)
	return err
}
