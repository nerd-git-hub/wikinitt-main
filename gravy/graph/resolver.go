package graph

import (
	"github.com/pranava-mohan/wikinitt/gravy/internal/articles"
	"github.com/pranava-mohan/wikinitt/gravy/internal/categories"
	"github.com/pranava-mohan/wikinitt/gravy/internal/community"
	"github.com/pranava-mohan/wikinitt/gravy/internal/maplocation"
	"github.com/pranava-mohan/wikinitt/gravy/internal/search"
	"github.com/pranava-mohan/wikinitt/gravy/internal/uploader"
	"github.com/pranava-mohan/wikinitt/gravy/internal/users"
)

type Resolver struct {
	UserRepo      users.Repository
	ArticleRepo   articles.Repository
	CategoryRepo  categories.Repository
	CommunityRepo community.Repository
	Uploader      uploader.Uploader
	SearchClient  *search.Client
	MapLocationRepo maplocation.Repository
}
