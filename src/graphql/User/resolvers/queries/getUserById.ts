import User from '../../../../MongoModels/User';
import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Subscription from '../../../../MongoModels/Subscription';
import SubscriptionPlanLimit from '../../../../utils/SubscriptionPlanLimit';
import mongoose from 'mongoose';

export default async function getUserById(
  parent: any,
  {token}: {token: string},
  context: any,
  info: any
) {
  let startLogId: String;

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
        functionName: 'getUserById',
        functionParams: [
          {
            paramName: 'token',
            paramValue: token,
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
      functionName: 'getUserById',
      functionParams: [
        {
          paramName: 'token',
          paramValue: 'HIDDEN_TOKEN',
          paramType: typeof token,
        },
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
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

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'getUserById',
      functionParams: [
        {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
    });

    const user: any = await User.findById(decodedToken.UserId).populate('fleets').populate('selectedFleet');
    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getUserById',
        functionParams: [
          {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
          {
            paramName: 'userId',
            paramValue: decodedToken.UserId,
            paramType: typeof decodedToken.UserId,
          },
        ],
        additionalMessage: 'User Not Found',
        startLogId,
      });

      return {
        userData: null,
        response: {
          message: 'User Not Found',
          status: 404,
        },
      };
    }

    // const decryptedUserData = await decryptObject(user);

    const subscription: any = await Subscription.findOne({user: user?._id});
    const fleetCount = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(user?._id),
        },
      },
      {
        $lookup: {
          from: 'fleets',
          localField: 'personalDetails.email',
          foreignField: 'ownerEmail',
          as: 'userFleets',
        },
      },
      {
        $unwind: '$userFleets',
      },
      {
        $lookup: {
          from: 'fleetInvitation',
          localField: 'userFleets._id',
          foreignField: 'fleetId',
          as: 'userInvitations',
        },
      },
      {
        $unwind: '$userInvitations',
      },
      {
        $group: {
          _id: '$_id',
          count: {$sum: 1},
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
        },
      },
    ]);
    const subData = {
      ...subscription?._doc,
      maxLimit: SubscriptionPlanLimit(subscription?.plan),
      limit: fleetCount[0] ? fleetCount[0].count : 0,
    };

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'getUserById',
      functionParams: [
        {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
      additionalMessage: 'Query Successful',
      startLogId,
    });

    return {
      userData: user,
      subscription: subData,
      response: {
        message: 'Query Successful',
        status: 200,
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getUserById',
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
      functionName: 'getUserById',
      functionParams: [
        {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
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
