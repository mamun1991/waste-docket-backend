import User from '../../../../MongoModels/User';
import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';

export default async function validateEmail(
  parent: any,
  {email}: {email: String},
  context: any,
  info: any
) {
  let startLogId: String;
  const {token} = context;
  const ENV_VALUES = await AwsSecrets.getInstance();

  if (context.token !== ENV_VALUES.BACKEND_API_KEY) {
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'validateEmail',
      functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
      additionalMessage: 'Invalid Permissions: Invalid API Key',
    });

    return {
      message: 'Not Authenticated',
      status: 401,
    };
  }

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'validateEmail',
      functionParams: [
        {
          paramName: 'email',
          paramValue: email,
          paramType: typeof email,
        },
        {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
      ],
    });

    const existEmail = await User.findOne({'personalDetails.email': email});
    if (existEmail) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'validateEmail',
        functionParams: [
          {
            paramName: 'email',
            paramValue: email,
            paramType: typeof email,
          },
          {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
        ],
        additionalMessage: 'Email already Exists',
        startLogId,
      });

      return {
        message: 'Email already Exists',
        status: 400,
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'validateEmail',
      functionParams: [
        {
          paramName: 'email',
          paramValue: email,
          paramType: typeof email,
        },
        {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
      ],
      additionalMessage: 'valid Email Successful',
      startLogId,
    });

    return {
      message: 'Valid Email',
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'validateEmail',
        functionParams: [
          {
            paramName: 'email',
            paramValue: email,
            paramType: typeof email,
          },
          {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
        ],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'validateEmail',
      functionParams: [
        {
          paramName: 'email',
          paramValue: email,
          paramType: typeof email,
        },
        {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
      ],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      message: err.message,
      status: 500,
    };
  }
}
