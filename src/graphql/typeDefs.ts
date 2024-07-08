import {gql} from 'apollo-server-express';
import {ApiLog} from './ApiLog';
import {User} from './User';
import {Shared} from './Shared';
import {Fleet} from './Fleet';
import {AppVersion} from './AppVersion';
import {Suggestion} from './suggestion';

const typeDefs = gql`
  scalar Upload
  scalar Date

  type Response {
    message: String!
    status: Int!
  }
  input PaginationArgs {
    pageNumber: Int!
    itemsPerPage: Int!
  }
  enum SortType {
    ASCENDING
    DESCENDING
    NULL
  }
  input SearchInput {
    paginationArgs: PaginationArgs
    searchText: String
    searchKeyword: String
    isPlainText: Boolean
    filteredFields: [String]
  }

  input SearchInputWithSorting {
    pageNumber: Int
    itemsPerPage: Int
    searchText: String
    searchKeyword: String
    sortColumn: String
    sortOrder: String
  }

  ${User.types}
  ${Fleet.types}

  ${ApiLog.queries}
  ${User.queries}
  ${Shared.queries}
  ${Fleet.queries}
  ${AppVersion.queries}
  ${Suggestion.queries}

  ${User.mutations}
  ${ApiLog.mutations}
  ${Shared.mutations}
  ${Fleet.mutations}
  ${AppVersion.mutations}
  ${Suggestion.mutations}
`;

export default typeDefs;
