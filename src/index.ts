import {ApolloServer} from 'apollo-server-express';

import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
// eslint-disable-next-line import/extensions
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import cors from 'cors';
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/typeDefs';

import AwsSecrets from './utils/getAwsSecrets';
import initSocket from './utils/initSocket';

let ENV_VALUES;

async function startApolloServer() {
  global.LOG_FILTER_TYPES = [
    'QUERY_START',
    'QUERY_END',
    'MUTATION_START',
    'MUTATION_END',
    'CRON_JOB_START',
    'CRON_JOB_END',
    'API_PROCESSING_START',
    'API_PROCESSING_END',
  ];

  global.LOG_FILTER_LEVELS = ['ERROR', 'INFO'];

  const app = express();

  const corsOptions = {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://studio.apollographql.com',
      'https://stageapi.wastedocket.ie/graphql',
      'https://prodapi.wastedocket.ie/',
      'http://www.wastedocket.ie/',
    ],
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(graphqlUploadExpress({maxFileSize: 16000000}));

  console.log('NODE_ENV=', process.env.NODE_ENV);

  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production',
    context: ({req}) => {
      const token = req.headers.authorization || '';
      return {token};
    },
  });

  ENV_VALUES = await AwsSecrets.getInstance();
  const dbURI = `mongodb://${ENV_VALUES.DATABASE_USER}:${ENV_VALUES.DATABASE_PASSWORD}@${ENV_VALUES.DATABASE_IP}:${ENV_VALUES.DATABASE_PORT}/${ENV_VALUES.DATABASE_NAME}`;
  await mongoose.connect(dbURI);
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error: '));
  db.once('open', () => {
    console.log('MongoDB Connected Successfully');
  });

  await server.start();
  server.applyMiddleware({app});
  await new Promise<void>(resolve => {
    httpServer.listen({port: ENV_VALUES.SERVER_PORT}, resolve);
  });

  initSocket();

  console.log('Apollo-Express Floor Started Successfully');
}

startApolloServer().then(() => console.log(`Server is running on PORT:${ENV_VALUES.SERVER_PORT}`));
