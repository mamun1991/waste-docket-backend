import jwt from 'jsonwebtoken';
import User from '../../MongoModels/User';
import {AccessToken} from '../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../utils/createApiLog';
import AwsSecrets from '../../utils/getAwsSecrets';
import {AccountTypes} from '../../constants/enums';

export default async function getEnvironmentVairables(_: any, _params: any, context: any) {
  let startLogId: String;
  const {token} = context;
  let accessTokenSecret: string;
  let decodedToken: AccessToken;
  const ENV_VALUES = await AwsSecrets.getInstance();
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getEnvironmentVairables',
        functionParams: [
          {
            paramName: 'token',
            paramValue: 'HIDDEN_TOKEN',
            paramType: typeof token,
          },
        ],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getEnvironmentVairables',
      functionParams: [
        {
          paramName: 'token',
          paramValue: 'HIDDEN_TOKEN',
          paramType: typeof token,
        },
      ],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      response: {
        message: err.message,
        status: 500,
      },
    };
  }

  const functionParams = [
    {
      paramName: 'token',
      paramValue: 'HIDDEN_TOKEN',
      paramType: typeof token,
    },
  ];
  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'getEnvironmentVairables',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getEnvironmentVairables',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        fleetData: null,
        response: {
          message: 'User not found',
          status: 404,
        },
      };
    }

    if (user.accountType !== AccountTypes.ADMIN) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getEnvironmentVairables',
        functionParams: functionParams,
        additionalMessage: 'User is not an admin.',
        startLogId,
      });
      return {
        fleetData: null,
        response: {
          message: 'User is not an admin.',
          status: 404,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getEnvironmentVairables',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      environmentVariables: JSON.stringify(ENV_VALUES),
      response: {
        message: 'Query Successfull!',
        status: 200,
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getEnvironmentVairables',
        functionParams: functionParams,
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        environmentVariables: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getEnvironmentVairables',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      environmentVariables: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
