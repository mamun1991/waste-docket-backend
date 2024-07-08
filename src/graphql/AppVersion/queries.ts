import {gql} from 'apollo-server-express';

export const queries = gql`
  type AppVersionData {
    androidLatestVersion: String
    isAndroidUpgradeMandatory: Boolean
    iosLatestVersion: String
    isIosUpgradeMandatory: Boolean
  }

  type AppVersionResponse {
    response: Response
    appVersion: AppVersionData
  }

  type Query {
    getAppVersion: AppVersionResponse
  }
`;
