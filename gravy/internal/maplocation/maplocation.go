package maplocation

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type MapLocation struct {
	ID          bson.ObjectID `bson:"_id,omitempty"`
	Name        string        `bson:"name"`
	Type        string        `bson:"type"`
	Coordinates []float64     `bson:"coordinates"` // [lat, lng]
	Description string        `bson:"description"`
	Menu        []MenuItem    `bson:"menu,omitempty"`
	CreatedAt   time.Time     `bson:"created_at"`
	UpdatedAt   time.Time     `bson:"updated_at"`
}

type MenuItem struct {
	Item  string `bson:"item"`
	Price string `bson:"price"`
}

type Repository interface {
	Create(ctx context.Context, loc *MapLocation) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context) ([]*MapLocation, error)
}

type repository struct {
	collection *mongo.Collection
}

func NewRepository(db *mongo.Database) Repository {
	return &repository{
		collection: db.Collection("map_locations"),
	}
}

func (r *repository) Create(ctx context.Context, loc *MapLocation) error {
	loc.ID = bson.NewObjectID()
	loc.CreatedAt = time.Now()
	loc.UpdatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, loc)
	return err
}

func (r *repository) Delete(ctx context.Context, id string) error {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

func (r *repository) List(ctx context.Context) ([]*MapLocation, error) {
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var locs []*MapLocation
	if err := cursor.All(ctx, &locs); err != nil {
		return nil, err
	}
	return locs, nil
}
