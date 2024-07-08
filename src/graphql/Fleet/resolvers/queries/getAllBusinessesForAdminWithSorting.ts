import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import {AccountTypes} from '../../../../constants/enums';

export default async function getAllBusinessesForAdminWithSorting(
  _: any,
  {
    fleetsInput,
  }: {
    fleetsInput: {
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
        functionName: 'getAllBusinessesForAdminWithSorting',
        functionParams: [
          {
            paramName: 'fleetsInput',
            paramValue: fleetsInput,
            paramType: typeof fleetsInput,
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
      functionName: 'getAllBusinessesForAdminWithSorting',
      functionParams: [
        {
          paramName: 'fleetsInput',
          paramValue: fleetsInput,
          paramType: typeof fleetsInput,
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
      paramName: 'fleetsInput',
      paramValue: fleetsInput,
      paramType: typeof fleetsInput,
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
      functionName: 'getAllBusinessesForAdminWithSorting',
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
        functionName: 'getAllBusinessesForAdminWithSorting',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        fleetData: null,
        response: {
          message: 'User not found',
          status: 404,
        },
      };
    }

    if (user.accountType !== AccountTypes.ADMIN) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllBusinessesForAdminWithSorting',
        functionParams: functionParams,
        additionalMessage: 'User is not an admin.',
        startLogId,
      });
      return {
        fleetData: null,
        response: {
          message: 'User is not an admin.',
          status: 404,
        },
      };
    }

    const {pageNumber, itemsPerPage, searchText, sortColumn, sortOrder} = fleetsInput;

    let searchQuery = {};

    if (searchText) {
      const searchRegex = new RegExp(searchText, 'i');
      const fieldsToSearch = [
        'name',
        'VAT',
        'permitHolderName',
        'permitNumber',
        'permitHolderAddress',
        'permitHolderContactDetails',
        'ownerEmail',
        'prefix',
        'individualDocketNumber',
      ];

      searchQuery = {
        $or: fieldsToSearch.map(field => ({[field]: searchRegex})),
      };
    }
    let sorts = {
      asc: 1,
      desc: -1,
    };
    const skip = (pageNumber - 1) * itemsPerPage;
    let fleets = await Fleet.find({
      $and: [searchQuery],
    })
      .sort({
        [sortColumn]: sorts[sortOrder as 'asc' | 'desc'] as 1 | -1,
      })
      .collation({locale: 'en', strength: 2})
      .skip(skip)
      .limit(itemsPerPage)
      .exec();

    const totalFleetsCount = await Fleet.countDocuments({
      $and: [searchQuery],
    }).exec();

    if (!fleets) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllBusinessesForAdminWithSorting',
        functionParams: functionParams,
        additionalMessage: 'Fleets not found',
        startLogId,
      });
      return {
        fleetData: null,
        response: {
          message: 'Fleets not found',
          status: 404,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getAllBusinessesForAdminWithSorting',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      totalCount: totalFleetsCount,
      fleetData: fleets,
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
        functionName: 'getAllBusinessesForAdminWithSorting',
        functionParams: functionParams,
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        fleetData: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getAllBusinessesForAdminWithSorting',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      fleetData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
