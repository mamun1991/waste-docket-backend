import {GraphQLScalarType} from 'graphql';

import {ApiLog} from './ApiLog';
import {User} from './User';
import {Shared} from './Shared';
import {Fleet} from './Fleet';
import {AppVersion} from './AppVersion';
import {Suggestion} from './suggestion';

const dateScalar = new GraphQLScalarType({
  name: 'Date',
  parseValue(value) {
    return new Date(value as Date);
  },
  serialize(value: Date) {
    return value.toUTCString();
  },
});

const resolvers = {
  Date: dateScalar,
  Query: {
    ...ApiLog.resolvers.queries,
    ...User.resolvers.queries,
    ...Shared.resolvers.queries,
    ...Fleet.resolvers.queries,
    ...AppVersion.resolvers.queries,
    ...Suggestion.resolvers.queries,
  },
  Mutation: {
    ...ApiLog.resolvers.mutations,
    ...User.resolvers.mutations,
    ...Shared.resolvers.mutations,
    ...Fleet.resolvers.mutations,
    ...AppVersion.resolvers.mutations,
    ...Suggestion.resolvers.mutations,
  },
};

export default resolvers;
