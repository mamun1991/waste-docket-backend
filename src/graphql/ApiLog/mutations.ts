import {gql} from 'apollo-server-express';

export const mutations = gql`
  enum AllowedLogTypes {
    QUERY_START
    QUERY_END
    MUTATION_START
    MUTATION_END
    CRON_JOB_START
    CRON_JOB_END
    API_PROCESSING_START
    API_PROCESSING_END
  }

  enum AllowedLogLevels {
    ERROR
    INFO
  }

  input ApiLogDataInput {
    type: AllowedLogTypes!
    level: AllowedLogLevels!
    message: String!
  }

  input ApiLogFilterConfig {
    types: [AllowedLogTypes]
    levels: [AllowedLogLevels]
  }

  type Mutation {
    createApiLog(apiLogData: ApiLogDataInput): Response
    updateApiFilter(filterConfig: ApiLogFilterConfig, token: String!): Response
  }
`;
