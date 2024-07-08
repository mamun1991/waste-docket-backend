import {AccessToken} from '../../constants/types';
import ApiLog from '../../MongoModels/ApiLog';
import User from '../../MongoModels/User';
import jwt from 'jsonwebtoken';
import AwsSecrets from '../../utils/getAwsSecrets';
import {AccountTypes} from '../../constants/enums';

const queries = {
  getApiLogFilter: async (parent, {token}, context, info) => {
    const ENV_VALUES = await AwsSecrets.getInstance();

    const accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    try {
      const decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
      const user = await User.findById(decodedToken.UserId, ['accountType']);

      if (AccountTypes.ADMIN !== user?.accountType) {
        return {
          response: {
            message: 'Not Authenticated',
            status: 401,
          },
        };
      }
      return {
        response: {
          message: 'Query Successful',
          status: 200,
        },
        types: LOG_FILTER_TYPES,
        levels: LOG_FILTER_LEVELS,
      };
    } catch (err) {
      return {
        response: {
          message: err.message,
          status: 500,
        },
      };
    }
  },

  getApiLogs: async (parent, {searchParams}, context, info) => {
    try {
      const ENV_VALUES = await AwsSecrets.getInstance();

      if (context.token !== ENV_VALUES.BACKEND_API_KEY) {
        return {
          response: {
            message: 'Not Authenticated',
            status: 401,
          },
        };
      }

      const {resultsPerPage, pageNumber} = searchParams;

      const apiLogs = await ApiLog.find()
        .skip(pageNumber * resultsPerPage - resultsPerPage)
        .limit(resultsPerPage);

      const logsCount = await ApiLog.count();

      return {
        response: {
          message: 'Query Successful',
          status: 200,
        },
        logData: apiLogs,
        logsCount,
      };
    } catch (err) {
      return {
        response: {
          message: err.message,
          status: 500,
        },
      };
    }
  },

  getApiLogsForAdmin: async (parent, {searchParams, token}, context, info) => {
    const ENV_VALUES = await AwsSecrets.getInstance();
    const accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    try {
      const decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
      const user = await User.findById(decodedToken.UserId, ['accountType']);

      if (user.accountType !== AccountTypes.ADMIN) {
        return {
          response: {
            message: 'Not Authenticated',
            status: 401,
          },
        };
      }

      const {resultsPerPage, pageNumber, logType, logLevel, functionName, id} = searchParams;

      const constructedQuery = {};

      if (logType?.length !== 0 && logType) {
        constructedQuery['type'] = {$in: logType};
      }
      if (logLevel?.length !== 0 && logLevel) {
        constructedQuery['level'] = {$in: logLevel};
      }
      if (functionName) {
        constructedQuery['functionName'] = functionName;
      }
      if (id) {
        constructedQuery['$or'] = [{startLogId: id}, {_id: id}];
      }
      const apiLogs = await ApiLog.find(constructedQuery)
        .sort({expireAt: -1, _id: -1})
        .skip(pageNumber * resultsPerPage - resultsPerPage)
        .limit(resultsPerPage);

      const logsCount = await ApiLog.count(constructedQuery);

      return {
        response: {
          message: 'Query Successful',
          status: 200,
        },
        logData: apiLogs,
        logsCount,
      };
    } catch (err) {
      return {
        response: {
          message: err.message,
          status: 500,
        },
      };
    }
  },
};

const mutations = {
  createApiLog: async (parent, {apiLogData}, context, info) => {
    try {
      const ENV_VALUES = await AwsSecrets.getInstance();

      if (context.token !== ENV_VALUES.BACKEND_API_KEY) {
        return {
          message: 'Not Authenticated',
          status: 401,
        };
      }

      const {type, level, message} = apiLogData;

      await ApiLog.create({
        type,
        level,
        message,
      });

      return {
        message: 'Api Log Added Successfully',
        status: 200,
      };
    } catch (err) {
      return {
        message: err.message,
        status: 500,
      };
    }
  },

  updateApiFilter: async (parent, {filterConfig, token}, context, info) => {
    const ENV_VALUES = await AwsSecrets.getInstance();
    const accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    try {
      const decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
      const user = await User.findById(decodedToken.UserId, 'accountDetails.accountType');

      if (user.accountType !== AccountTypes.ADMIN) {
        return {
          response: {
            message: 'Not Authenticated',
            status: 401,
          },
        };
      }

      const {types, levels} = filterConfig;

      LOG_FILTER_TYPES = types;
      LOG_FILTER_LEVELS = levels;

      return {
        message: 'API Log Filter Updated Successfully',
        status: 200,
      };
    } catch (err) {
      return {
        message: err.message,
        status: 500,
      };
    }
  },
};

export const resolvers = {queries, mutations};
