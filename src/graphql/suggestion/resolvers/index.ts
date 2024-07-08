import getSuggestions from './queries/getSuggestions';

import addSuggestion from './mutations/addSuggestion';
import deleteSuggestion from './mutations/deleteSuggestion';
const queries = {
  getSuggestions,
};

const mutations = {
  addSuggestion,
  deleteSuggestion,
};

export const resolvers = {queries, mutations};
