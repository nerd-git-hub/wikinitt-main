import { gql } from "@/gql/gql";

export const SEARCH_ARTICLES = gql(`
  query SearchArticles($query: String!, $limit: Int, $offset: Int) {
    searchArticles(query: $query, limit: $limit, offset: $offset) {
      id
      title
      slug
      description
      thumbnail
      category
      createdAt
      author {
        name
        avatar
      }
    }
  }
`);

export const SEARCH_COMMUNITY = gql(`
  query SearchCommunity($query: String!, $limit: Int, $offset: Int) {
    searchCommunity(query: $query, limit: $limit, offset: $offset) {
      ... on Post {
        id
        title
        content
        createdAt
        author {
          name
          username
          avatar
        }
        group {
          name
          slug
        }
      }
      ... on Group {
        id
        name
        description
        slug
        membersCount
        createdAt
      }
      ... on Comment {
        id
        content
        createdAt
        author {
          name
          username
          avatar
        }
        post {
          id
          title
          group {
            slug
          }
        }
      }
    }
  }
`);
