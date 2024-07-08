import {gql} from 'apollo-server-express';

export const mutations = gql`
  input SuggestionInput {
    suggestion: String
  }

  type Mutation {
    addSuggestion(suggestionData: SuggestionInput): Response
    deleteSuggestion(suggestionId: String, doDeleteAll: Boolean): Response
  }
`;
