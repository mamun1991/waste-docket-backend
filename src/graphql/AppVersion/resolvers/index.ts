import getAppVersion from './queries/getAppVersion';

import manageAppVersion from './mutations/manageAppVersion';
const queries = {
  getAppVersion,
};

const mutations = {
  manageAppVersion,
};

export const resolvers = {queries, mutations};
