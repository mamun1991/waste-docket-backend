import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';

export default async function addFleet(_: any, {fleetData}, context: any) {
  let startLogId: String = '';
  const {token} = context;
  let accessTokenSecret: string;
  let decodedToken: AccessToken;
  const ENV_VALUES = await AwsSecrets.getInstance();
  const functionParams = [
    {
      paramName: 'token',
      paramValue: 'HIDDEN_TOKEN',
      paramType: typeof token,
    },
    {
      paramName: 'fleetData',
      paramValue: fleetData,
      paramType: typeof fleetData,
    },
  ];
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
    if (!decodedToken) {
      return {
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addFleet',
        functionParams: functionParams,
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
      functionName: 'addFleet',
      functionParams: functionParams,
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

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'addFleet',
      functionParams: functionParams,
    });

    const userId = new mongoose.Types.ObjectId(decodedToken.UserId);
    const user = await User.findById(userId);

    const fleet = await Fleet.create({
      isIndividual: false,
      ...fleetData,
      ownerEmail: user.personalDetails.email,
      membersEmails: [],
    });
    await User.updateOne(
      {'personalDetails.email': user.personalDetails.email},
      {$push: {fleets: fleet._id}}
    );

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'addFleet',
      functionParams: functionParams,
      additionalMessage: 'Business Type Of Fleet Created',
      startLogId,
    });

    return {
      response: {
        status: 200,
        message: 'Business Type Of Fleet Created',
      },
      fleetData: fleet,
    };

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'addFleet',
      functionParams: functionParams,
      additionalMessage: 'Query Unsuccessful',
      startLogId,
    });

    return {
      response: {
        status: 500,
        message: 'Query Unsuccessful',
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addFleet',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        userData: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'addFleet',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      userData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
