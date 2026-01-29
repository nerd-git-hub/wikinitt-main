import { gql } from "../gql/gql";

export const GET_ARTICLE_BY_SLUG = gql(`
  query GetArticleBySlug($slug: String!) {
    articleBySlug(slug: $slug) {
      id
      title
      slug
      content
      category
      thumbnail
      createdAt
      updatedAt
      description
      author {
        id
        name
        username
        avatar
      }
    }
  }
`);
