export const GET_MAP_LOCATIONS = `
  query GetMapLocations {
    mapLocations {
      id
      name
      type
      coordinates
      description
      menu {
        item
        price
      }
    }
  }
`;

export const ADD_MAP_LOCATION = `
  mutation AddMapLocation($input: MapLocationInput!) {
    addMapLocation(input: $input) {
      id
      name
      type
      coordinates
      description
      menu {
        item
        price
      }
    }
  }
`;

export const DELETE_MAP_LOCATION = `
  mutation DeleteMapLocation($id: ID!) {
    deleteMapLocation(id: $id)
  }
`;
