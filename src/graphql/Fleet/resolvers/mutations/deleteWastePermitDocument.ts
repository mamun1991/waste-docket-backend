import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import User from '../../../../MongoModels/User';
import WasteCollectionPermitDocument from '../../../../MongoModels/WasteCollectionPermitDocument';
import deleteCollectionDocumentFromBucket from '../../../../lib/deleteFileFromS3';

function isUserInFleet(fleet, user) {
  const userEmail = user.personalDetails.email;
  const {ownerEmail} = fleet;

  return ownerEmail === userEmail;
}

export default async function deleteWastePermitDocument(
  _: any,
  {fleetId, wasteCollectionPermitDocumentId},
  context: any
) {
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
      paramName: 'wasteCollectionPermitDocumentId',
      paramValue: wasteCollectionPermitDocumentId,
      paramType: typeof wasteCollectionPermitDocumentId,
    },
    {
      paramName: 'fleetId',
      paramValue: fleetId,
      paramType: typeof fleetId,
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
        functionName: 'deleteWastePermitDocument',
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
      functionName: 'deleteWastePermitDocument',
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
      functionName: 'deleteWastePermitDocument',
      functionParams: functionParams,
    });

    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'deleteWastePermitDocument',
        functionParams: functionParams,
        additionalMessage: 'Fleet Does Not Exist',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'Fleet Does Not Exist',
        },
      };
    }

    const user = await User.findById(decodedToken.UserId);
    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteWastePermitDocument',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        response: {
          message: 'User does not exist',
          status: 404,
        },
      };
    }

    const isInFleet = isUserInFleet(fleet, user);

    if (!isInFleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'deleteWastePermitDocument',
        functionParams: functionParams,
        additionalMessage: 'User is not the owner of the business',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'User is not the owner of the business',
        },
      };
    }

    const collectionPermitDocuments = await WasteCollectionPermitDocument.findById(
      wasteCollectionPermitDocumentId
    );

    if (!collectionPermitDocuments) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'deleteWastePermitDocument',
        functionParams: functionParams,
        additionalMessage: 'Waste Collection Permit Document does not exist.',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'Waste Collection Permit Document does not exist.',
        },
      };
    }

    const resultFromS3 = await deleteCollectionDocumentFromBucket(_, {
      fileUrl: collectionPermitDocuments.documentUrl,
      accessToken: token,
    });

    if (resultFromS3.message === 'Document Deleted Successfully') {
      await WasteCollectionPermitDocument.findByIdAndDelete(wasteCollectionPermitDocumentId);
    }

    console.log('resultFroms3 ===>', resultFromS3);

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'deleteWastePermitDocument',
      functionParams: functionParams,
      additionalMessage: 'Waste Collection Permit Document Deleted Successfully.',
      startLogId,
    });

    return {
      response: {
        status: 200,
        message: 'Waste Collection Permit Document Deleted Successfully.',
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteWastePermitDocument',
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
      functionName: 'deleteWastePermitDocument',
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
