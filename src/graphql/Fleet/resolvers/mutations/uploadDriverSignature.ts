import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import DriverSignature from '../../../../MongoModels/DriverSignature';
export default async function uploadDriverSignature(_: any, {signatureData}, context: any) {
  let startLogId: String = '';
  const {token} = context;
  let accessTokenSecret: string;
  let decodedToken: AccessToken;
  const ENV_VALUES = await AwsSecrets.getInstance();
  const {signatureId, fleet, signatureChunk} = signatureData;
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
        functionName: 'uploadDriverSignature',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
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

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'uploadDriverSignature',
      functionParams: [
        {
          paramName: 'Signature chunk',
          paramValue: 'signature chunk',
          paramType: typeof signatureChunk,
        },
      ],
    });

    const existingChunk = await DriverSignature.findOne({_id: signatureId});
    let uploadNewChunk;
    if (existingChunk) {
      existingChunk.signatureUrl += signatureChunk;
      await existingChunk.save();
    } else {
      const userId = new mongoose.Types.ObjectId(decodedToken.UserId);
      uploadNewChunk = await DriverSignature.create({
        signatureUrl: signatureChunk,
        fleet,
        user: userId,
      });
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'uploadDriverSignature',
      functionParams: [
        {
          paramName: 'Signature chunk',
          paramValue: 'signature chunk',
          paramType: typeof signatureChunk,
        },
      ],
      additionalMessage: 'File chunk uploaded',
      startLogId,
    });

    return {
      _id: signatureId ? signatureId : uploadNewChunk?._id,
      response: {
        status: 200,
        message: 'File chunk uploaded',
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'uploadDriverSignature',
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
      functionName: 'uploadDriverSignature',
      functionParams: [
        {
          paramName: 'Signature chunk',
          paramValue: 'signature chunk',
          paramType: typeof signatureChunk,
        },
      ],
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
