import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import WasteCollectionPermitDocument from '../../../../MongoModels/WasteCollectionPermitDocument';
import {AWSS3Uploader} from '../../../../lib/getFileUrl';

const uploader = new AWSS3Uploader();

export default async function getDocumentDownloadUrl(
  _: any,
  {
    wastePermitDocumentId,
    fleetId,
  }: {
    fleetId: string;
    wastePermitDocumentId: string;
  },
  context: any
) {
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
        functionName: 'getDocumentDownloadUrl',
        functionParams: [
          {
            paramName: 'wastePermitDocumentId',
            paramValue: wastePermitDocumentId,
            paramType: typeof wastePermitDocumentId,
          },
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

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getDocumentDownloadUrl',
      functionParams: [
        {
          paramName: 'wastePermitDocumentId',
          paramValue: wastePermitDocumentId,
          paramType: typeof wastePermitDocumentId,
        },
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
      paramName: 'wastePermitDocumentId',
      paramValue: wastePermitDocumentId,
      paramType: typeof wastePermitDocumentId,
    },
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
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'getDocumentDownloadUrl',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId)
      .populate('fleets')
      .populate('invitations')
      .exec();

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getDocumentDownloadUrl',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        customerData: null,
        response: {
          message: 'User not found',
          status: 404,
        },
      };
    }
    const fleet = await Fleet.findById(fleetId);
    await User.findByIdAndUpdate(user._id, {
      $set: {selectedFleet: fleet._id},
    });

    const collectionPermitDocuments = await WasteCollectionPermitDocument.findById(
      wastePermitDocumentId
    );

    const documentDownloadUrl = await uploader.generateFileAccessLink(_, {
      fileUrl: collectionPermitDocuments?.documentUrl as string,
      fileType: 'application/pdf',
    });

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getDocumentDownloadUrl',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });
    return {
      documentUrl: documentDownloadUrl,
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
        functionName: 'getDocumentDownloadUrl',
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
      functionName: 'getDocumentDownloadUrl',
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
}
