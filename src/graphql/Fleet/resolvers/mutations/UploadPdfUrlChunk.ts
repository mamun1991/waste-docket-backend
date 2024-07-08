import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Pdf from '../../../../MongoModels/Pdf';
export default async function uploadPdfUrlChunk(_: any, {pdfData}, context: any) {
  let startLogId: String = '';
  const {token} = context;
  let accessTokenSecret: string;
  let decodedToken: AccessToken;
  const ENV_VALUES = await AwsSecrets.getInstance();
  const {pdfId, customerEmail, pdfChunk} = pdfData;
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
        functionName: 'uploadPdfUrlChunk',
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
      functionName: 'uploadPdfUrlChunk',
      functionParams: [
        {
          paramName: 'Pdf chunk',
          paramValue: 'Pdf chunk',
          paramType: typeof pdfChunk,
        },
      ],
    });

    const existingChunk = await Pdf.findOne({_id: pdfId});
    let uploadNewChunk;
    if (existingChunk) {
      existingChunk.pdfUrl += pdfChunk;
      await existingChunk.save();
    } else {
      const userId = new mongoose.Types.ObjectId(decodedToken.UserId);
      uploadNewChunk = await Pdf.create({
        pdfUrl: pdfChunk,
        user: userId,
        customerEmail,
      });
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'uploadPdfUrlChunk',
      functionParams: [
        {
          paramName: 'Pdf chunk',
          paramValue: 'Pdf chunk',
          paramType: typeof pdfChunk,
        },
      ],
      additionalMessage: 'File chunk uploaded',
      startLogId,
    });

    return {
      _id: pdfId ? pdfId : uploadNewChunk?._id,
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
        functionName: 'uploadPdfUrlChunk',
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
      functionName: 'uploadPdfUrlChunk',
      functionParams: [
        {
          paramName: 'Pdf chunk',
          paramValue: 'Pdf chunk',
          paramType: typeof pdfChunk,
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
