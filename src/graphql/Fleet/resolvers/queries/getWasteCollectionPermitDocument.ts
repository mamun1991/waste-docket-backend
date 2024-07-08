import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import WasteCollectionPermitDocument from '../../../../MongoModels/WasteCollectionPermitDocument';

export default async function getWasteCollectionPermitDocument(
  _: any,
  {
    wastePermitDocumentInput,
    fleetId,
  }: {
    fleetId: string;
    wastePermitDocumentInput: {
      paginationArgs: {pageNumber: number; itemsPerPage: number};
      searchText: string;
      isPlainText: string;
      filteredFields: [string];
    };
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
        functionName: 'getWasteCollectionPermitDocument',
        functionParams: [
          {
            paramName: 'wastePermitDocumentInput',
            paramValue: wastePermitDocumentInput,
            paramType: typeof wastePermitDocumentInput,
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
      functionName: 'getWasteCollectionPermitDocument',
      functionParams: [
        {
          paramName: 'wastePermitDocumentInput',
          paramValue: wastePermitDocumentInput,
          paramType: typeof wastePermitDocumentInput,
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
      paramName: 'wastePermitDocumentInput',
      paramValue: wastePermitDocumentInput,
      paramType: typeof wastePermitDocumentInput,
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
      functionName: 'getWasteCollectionPermitDocument',
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
        functionName: 'getWasteCollectionPermitDocument',
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
    const {paginationArgs, searchText, isPlainText, filteredFields} = wastePermitDocumentInput;

    let searchQuery = {};
    let projectionQuery = {};
    let sortQuery;

    if (searchText) {
      const searchRegex = new RegExp(searchText, isPlainText ? 'i' : undefined);
      const fieldsToSearch = filteredFields?.length ? filteredFields : ['documentName'];

      searchQuery = {
        $or: fieldsToSearch.map(field => ({[field]: searchRegex})),
      };
      projectionQuery = {};

      sortQuery = {};
    }

    let collectionPermitDocuments;
    if (paginationArgs) {
      const {pageNumber, itemsPerPage} = paginationArgs;
      const skip = (pageNumber - 1) * itemsPerPage;
      collectionPermitDocuments = await WasteCollectionPermitDocument.find({
        $and: [{fleet: fleetId}, searchQuery],
      })
        .populate('fleet')
        .populate('user')
        .select(projectionQuery)
        .sort(sortQuery)
        .skip(skip)
        .limit(itemsPerPage)
        .exec();
    } else {
      collectionPermitDocuments = await WasteCollectionPermitDocument.find({
        $and: [{fleet: fleetId}, searchQuery],
      })
        .populate('fleet')
        .populate('user')
        .select(projectionQuery)
        .sort(sortQuery)
        .exec();
    }
    const collectionPermitDocumentsWithoutLink = await Promise.all(
      collectionPermitDocuments.map(async (doc: any) => {
        const {documentUrl, ...docData} = doc.toObject();
        return {
          ...docData,
        };
      })
    );
    const totalFacilityCount = await WasteCollectionPermitDocument.countDocuments({
      $and: [{fleet: fleetId}, searchQuery],
    }).exec();

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getWasteCollectionPermitDocument',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });
    return {
      totalCount: totalFacilityCount,
      wasteCollectionPermitDocument: collectionPermitDocumentsWithoutLink,
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
        functionName: 'getWasteCollectionPermitDocument',
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
      functionName: 'getWasteCollectionPermitDocument',
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
