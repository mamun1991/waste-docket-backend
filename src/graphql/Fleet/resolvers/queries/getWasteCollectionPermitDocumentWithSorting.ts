import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import WasteCollectionPermitDocument from '../../../../MongoModels/WasteCollectionPermitDocument';
import Fleet from '../../../../MongoModels/Fleet';

export default async function getWasteCollectionPermitDocumentWithSorting(
  _: any,
  {
    wastePermitDocumentWithSortingInput,
  }: {
    wastePermitDocumentWithSortingInput: {
      sortColumn: string;
      sortOrder: string;
      pageNumber: number;
      itemsPerPage: number;
      searchText: string;
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
        functionName: 'getWasteCollectionPermitDocumentWithSorting',
        functionParams: [
          {
            paramName: 'wastePermitDocumentWithSortingInput',
            paramValue: wastePermitDocumentWithSortingInput,
            paramType: typeof wastePermitDocumentWithSortingInput,
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
      functionName: 'getWasteCollectionPermitDocumentWithSorting',
      functionParams: [
        {
          paramName: 'wastePermitDocumentWithSortingInput',
          paramValue: wastePermitDocumentWithSortingInput,
          paramType: typeof wastePermitDocumentWithSortingInput,
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
      paramName: 'wastePermitDocumentWithSortingInput',
      paramValue: wastePermitDocumentWithSortingInput,
      paramType: typeof wastePermitDocumentWithSortingInput,
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
      functionName: 'getWasteCollectionPermitDocumentWithSorting',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId).populate('fleets').exec();

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getWasteCollectionPermitDocumentWithSorting',
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
    console.log('working');
    
    const userFleetObject: any = user?.fleets?.length > 0 ? user?.fleets[0] : {};
    const fleet = await Fleet.findById(userFleetObject?._id);
    if (!fleet) {
      console.log(
        `(getWasteCollectionPermitDocumentWithSorting) User: ${JSON.stringify(
          user
        )} Fleet not found ${JSON.stringify(fleet)}`
      );
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getWasteCollectionPermitDocumentWithSorting',
        functionParams: functionParams,
        additionalMessage: 'Fleet not found',
        startLogId,
      });
      return {
        docketData: null,
        membersData: null,
        response: {
          message: 'Fleet not found',
          status: 404,
        },
      };
    }
    const {itemsPerPage, pageNumber, searchText} = wastePermitDocumentWithSortingInput;

    let searchQuery = {};
    let projectionQuery = {};

    if (searchText) {
      const searchRegex = new RegExp(searchText, 'i');
      const fieldsToSearch = ['documentName'];

      searchQuery = {
        $or: fieldsToSearch.map(field => ({[field]: searchRegex})),
      };
      projectionQuery = {};
    }
    let sorts = {
      asc: 1,
      desc: -1,
    };
    let collectionPermitDocuments;

    const skip = (pageNumber - 1) * itemsPerPage;
    collectionPermitDocuments = await WasteCollectionPermitDocument.find({
      $and: [{fleet: fleet?._id}, searchQuery],
    })
      .populate('fleet')
      .populate('user')
      .select(projectionQuery)
      .sort({
        [wastePermitDocumentWithSortingInput.sortColumn]: sorts[
          wastePermitDocumentWithSortingInput.sortOrder as 'asc' | 'desc'
        ] as 1 | -1,
      })
      .collation({locale: 'en', strength: 2})
      .skip(skip)
      .limit(itemsPerPage)
      .exec();
    const collectionPermitDocumentsWithoutLink = await Promise.all(
      collectionPermitDocuments.map(async (doc: any) => {
        const {documentUrl, ...docData} = doc.toObject();
        return {
          ...docData,
        };
      })
    );
    const totalCount = await WasteCollectionPermitDocument.countDocuments({
      $and: [{fleet: fleet?._id}, searchQuery],
    }).exec();

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getWasteCollectionPermitDocumentWithSorting',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });
    return {
      totalCount: totalCount,
      wasteCollectionPermitDocument: collectionPermitDocumentsWithoutLink,
      fleet: fleet,
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
        functionName: 'getWasteCollectionPermitDocumentWithSorting',
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
      functionName: 'getWasteCollectionPermitDocumentWithSorting',
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
