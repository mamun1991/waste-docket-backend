import {gql} from 'apollo-server-express';

export const queries = gql`
  type SuggestionData {
    _id: String
    name: String
    email: String
    suggestion: String
    createdAt: String
    fleet: Fleet
    fleetName: String
    fleetOwnerEmail: String
  }

  type SuggestionResponse {
    response: Response
    suggestions: [SuggestionData]
    totalCount: Int
  }

  type Query {
    getSuggestions(
      fleetId: String
      doFetchJustCount: Boolean
      searchParams: GeneralSearchParamsWithSorting
    ): SuggestionResponse
  }
`;
