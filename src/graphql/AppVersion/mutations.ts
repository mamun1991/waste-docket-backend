import {gql} from 'apollo-server-express';

export const mutations = gql`
  input AppVersionInput {
    androidLatestVersion: String
    isAndroidUpgradeMandatory: Boolean
    iosLatestVersion: String
    isIosUpgradeMandatory: Boolean
  }

  type Mutation {
    manageAppVersion(appVersionData: AppVersionInput): Response
  }
`;
