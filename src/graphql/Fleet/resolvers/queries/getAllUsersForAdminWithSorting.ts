import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import {AccountTypes} from '../../../../constants/enums';

export default async function getAllUsersForAdminWithSorting(
  _: any,
  {searchParams},
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
        functionName: 'getAllUsersForAdminWithSorting',
        functionParams: [
          {
            paramName: 'searchParams',
            paramValue: searchParams,
            paramType: typeof searchParams,
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
      functionName: 'getAllUsersForAdminWithSorting',
      functionParams: [
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
      paramName: 'token',
      paramValue: 'HIDDEN_TOKEN',
      paramType: typeof token,
    },
  ];
  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'getAllUsersForAdminWithSorting',
      functionParams: functionParams,
    });

    const {pageNumber, resultsPerPage, startDate, endDate, searchText, sortColumn, sortOrder} =
      searchParams;

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllUsersForAdminWithSorting',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        userData: null,
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
        functionName: 'getAllFleetsForAdmin',
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

    const regex = new RegExp(searchText, 'i');

    let matchClause;
    if (startDate && endDate) {
      matchClause = {
        $and: [
          {
            $or: [
              {'personalDetails.name': {$regex: regex}},
              {'personalDetails.email': {$regex: regex}},
            ],
          },
          {
            $or: [{'docketData.date': {$exists: true, $gte: startDate, $lte: endDate}}],
          },
        ],
      };
    } else {
      matchClause = {
        $and: [
          {
            $or: [
              {'personalDetails.name': {$regex: regex}},
              {'personalDetails.email': {$regex: regex}},
            ],
          },
        ],
      };
    }

    const query = [
      {
        $match: matchClause,
      },
    ];

    let sorts = {
      asc: 1,
      desc: -1,
    };

    let UserData = await User.aggregate(query)
      .sort({
        [sortColumn]: sorts[sortOrder as 'asc' | 'desc'] as 1 | -1,
      })
      .collation({locale: 'en', strength: 2})
      .skip(pageNumber * resultsPerPage - resultsPerPage)
      .limit(resultsPerPage);

    const queryCount = [
      {
        $match: matchClause,
      },
      {
        $count: 'totalCount',
      },
    ];

    const [totalCountResult] = await User.aggregate(queryCount);
    const totalCount = totalCountResult ? totalCountResult.totalCount : 0;

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getAllUsersForAdminWithSorting',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      totalCount: totalCount,
      userData: UserData,
      response: {
        message: 'Query Successful!',
        status: 200,
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllUsersForAdminWithSorting',
        functionParams: functionParams,
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
      functionName: 'getAllUsersForAdminWithSorting',
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
