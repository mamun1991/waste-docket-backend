import {gql} from 'apollo-server-express';

export const queries = gql`
  enum ParamLogLevels {
    ERROR
    INFO
  }

  enum ParamLogTypes {
    QUERY_START
    QUERY_END
    MUTATION_START
    MUTATION_END
    CRON_JOB_START
    CRON_JOB_END
    API_PROCESSING_START
    API_PROCESSING_END
  }

  type ApiLogFilterResponse {
    response: Response
    types: [String]
    levels: [String]
  }

  type FunctionParam {
    paramName: String
    paramValue: String
    paramType: String
  }

  type ApiLog {
    type: String
    level: String
    functionName: String
    functionParams: [FunctionParam]
    additionalMessage: String
    startLogId: String
    createdAt: String
  }

  type ApiLogsResponse {
    response: Response
    logData: [ApiLog]
    logsCount: Int
  }

  input ApiLogSearchParams {
    pageNumber: Int
    resultsPerPage: Int
    logType: [ParamLogTypes]
    logLevel: [ParamLogLevels]
    functionName: String
    id: String
  }

  type Query {
    getApiLogFilter(token: String!): ApiLogFilterResponse
    getApiLogs(searchParams: ApiLogSearchParams): ApiLogsResponse
    getApiLogsForAdmin(searchParams: ApiLogSearchParams, token: String!): ApiLogsResponse
  }
`;
