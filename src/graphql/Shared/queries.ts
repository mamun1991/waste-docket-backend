import {gql} from 'apollo-server-express';

export const queries = gql`
  type PoliciesURLResponse {
    response: Response
    privacyPolicyURL: String
    termsOfServiceURL: String
    gdprURL: String
  }

  type environmentVariablesResponse {
    response: Response
    environmentVariables: String
  }

  type Query {
    getENV: String
    getPoliciesURL: PoliciesURLResponse
    getEnvironmentVairables: environmentVariablesResponse
  }
`;
