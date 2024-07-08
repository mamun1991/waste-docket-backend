import jwt from 'jsonwebtoken';
import Fleet from '../../../../MongoModels/Fleet';
import {AccessToken} from '../../../../constants/types';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';

export default async function getTermsAndConditionsByFleetId(
  _: any,
  {fleetId}: {fleetId: string},
  context: any
) {
  const {token} = context;
  let startLogId: string | undefined;
  let accessTokenSecret: string;
  let decodedToken: AccessToken | undefined;
  const ENV_VALUES = await AwsSecrets.getInstance();
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getTermsAndConditionsByFleetId',
        functionParams: [
          {
            paramName: 'fleetId',
            paramValue: fleetId,
            paramType: typeof fleetId,
          },
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
  }
  const functionParams = [
    {
      paramName: 'fleetId',
      paramValue: fleetId,
      paramType: typeof fleetId,
    },
    {
      paramName: 'token',
      paramValue: 'HIDDEN_TOKEN',
      paramType: typeof token,
    },
  ];
  try {
    const fleet = await Fleet.findById(fleetId);
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getTermsAndConditionsByFleetId',
      functionParams,
      additionalMessage: 'Query successful!',
      startLogId,
    });
    return {
      fleet,
      response: {
        message: 'Query Successful!',
        status: 200,
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getTermsAndConditionsByFleetId',
        functionParams,
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });
      return {
        docketData: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getTermsAndConditionsByFleetId',
      functionParams,
      additionalMessage: err.message,
      startLogId,
    });
    return {
      docketData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
