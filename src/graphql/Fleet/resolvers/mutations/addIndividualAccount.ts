import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';

export default async function addIndividualAccount(_: any, {permitNumber}, context: any) {
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
      paramName: 'permitNumber',
      paramValue: permitNumber,
      paramType: typeof permitNumber,
    },
  ];
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
    if (!decodedToken) {
      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addIndividualAccount',
        functionParams: functionParams,
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
      functionName: 'addIndividualAccount',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      message: err.message,
      status: 500,
    };
  }

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'addIndividualAccount',
      functionParams: functionParams,
    });

    const userId = new mongoose.Types.ObjectId(decodedToken.UserId);
    const user = await User.findById(userId);
    if (!permitNumber) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'addIndividualAccount',
        functionParams: functionParams,
        additionalMessage: 'Please Provide Permit Number ',
        startLogId,
      });

      return {
        status: 400,
        message: 'Please Provide Permit Number',
      };
    }

    const isIndividualAccountExists = await Fleet.findOne({
      isIndividual: true,
      ownerEmail: user.personalDetails.email,
    });

    if (isIndividualAccountExists) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'addIndividualAccount',
        functionParams: functionParams,
        additionalMessage: 'Individual Account Already Exists.',
        startLogId,
      });
      return {
        status: 400,
        message: 'Individual Account Already Exists.',
      };
    }
    const fleet = await Fleet.findOneAndUpdate(
      {ownerEmail: user.personalDetails.email},
      {
        isIndividual: true,
        name: user.personalDetails.name,
        ownerEmail: user.personalDetails.email,
        permitNumber,
        membersEmails: [],
      },
      {upsert: true, new: true, setDefaultsOnInsert: true}
    );
    await User.updateOne(
      {'personalDetails.email': user.personalDetails.email},
      {
        $set: {
          selectedFleet: fleet._id,
        },
        $push: {
          fleets: fleet._id,
        },
      }
    );
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'completeSignUp',
      functionParams: functionParams,
      additionalMessage: 'Individual Account Created',
      startLogId,
    });

    return {
      status: 200,
      message: 'Individual Account Created',
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addIndividualAccount',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
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
      functionName: 'addIndividualAccount',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      message: err.message,
      status: 500,
    };
  }
}
