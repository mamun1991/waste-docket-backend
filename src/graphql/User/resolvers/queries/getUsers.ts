import jwt from 'jsonwebtoken';
import {SortOrder} from 'mongoose';
import {AddedDoc, SortType} from '../../../../constants/enums';

import User from '../../../../MongoModels/User';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import {getBaseQuery} from '../../../../utils/getBaseQuery';

export default async function getUsers(
  _: any,
  {
    usersInput,
  }: {
    usersInput: {
      paginationArgs: {pageNumber: number; itemsPerPage: number};
      sortingInput: {columnName: string; sortType: String};
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
        functionName: 'getUsers',
        functionParams: [
          {
            paramName: 'usersInput',
            paramValue: usersInput,
            paramType: typeof usersInput,
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
      functionName: 'getUsers',
      functionParams: [
        {
          paramName: 'usersInput',
          paramValue: usersInput,
          paramType: typeof usersInput,
        },
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
      functionName: 'getUsers',
      functionParams: [
        {
          paramName: 'usersInput',
          paramValue: usersInput,
          paramType: typeof usersInput,
        },
        {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
    });

    const baseQuery = getBaseQuery(usersInput, AddedDoc.USER);

    const user = await User.findById(decodedToken.UserId);
    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getUsers',
        functionParams: [
          {
            paramName: 'usersInput',
            paramValue: usersInput,
            paramType: typeof usersInput,
          },
          {
            paramName: 'userId',
            paramValue: decodedToken.UserId,
            paramType: typeof decodedToken.UserId,
          },
        ],
        additionalMessage: 'User Not Found!',
        startLogId,
      });
      return {
        usersData: null,
        response: {
          message: 'User Not Found!',
          status: 404,
        },
      };
    }

    let sort =
      usersInput.sortingInput.sortType !== ''
        ? {
            [usersInput.sortingInput.columnName !== ''
              ? `personalDetails.${usersInput.sortingInput.columnName}`
              : 'createdAt']:
              usersInput.sortingInput.sortType === SortType.ASCENDING.toString()
                ? (1 as SortOrder)
                : (-1 as SortOrder),
          }
        : {};

    if (usersInput.sortingInput.columnName === 'accountType') {
      const newSort = {accountType: sort['personalDetails.accountType']};
      sort = newSort;
    }
    const count = await User.count(baseQuery);
    let users: any;

    if (usersInput.paginationArgs) {
      users = await User.find(baseQuery)
        .sort(sort)
        .skip(
          usersInput.paginationArgs.pageNumber * usersInput.paginationArgs.itemsPerPage -
            usersInput.paginationArgs.itemsPerPage
        )
        .limit(usersInput.paginationArgs?.itemsPerPage)
        .populate('operatorId');
    } else {
      users = await User.find(baseQuery).sort(sort);
    }
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getUsers',
      functionParams: [
        {
          paramName: 'usersInput',
          paramValue: usersInput,
          paramType: typeof usersInput,
        },
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
      additionalMessage: 'Query succesful!',
      startLogId,
    });
    users = users.map(el => ({
      _id: el._id,
      accountType: el.accountType,
      personalDetails: {...el.personalDetails},
      operatorId: el?.operatorId?._id,
      operatorName: el?.operatorId?.name,
      ...el,
    }));

    return {
      totalCount: count,
      usersData: users,
      response: {
        message: 'Query Successfull!',
        status: 200,
      },
    };

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'getUsers',
      functionParams: [
        {
          paramName: 'usersInput',
          paramValue: usersInput,
          paramType: typeof usersInput,
        },
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

    if (!users) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getUsers',
        functionParams: [
          {
            paramName: 'usersInput',
            paramValue: usersInput,
            paramType: typeof usersInput,
          },
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
        usersData: null,
        response: {
          message: 'User Not Found',
          status: 404,
        },
      };
    }
    users = users.map(el => ({
      _id: el._id,
      accountType: el.accountType,
      personalDetails: {...el.personalDetails},
      operatorId: el?.operatorId?._id,
      operatorName: el?.operatorId?.name,
      ...el,
    }));

    return {
      usersData: users,
      totalCount: count,
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
        functionName: 'getUsers',
        functionParams: [
          {
            paramName: 'usersInput',
            paramValue: usersInput,
            paramType: typeof usersInput,
          },
          {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
        ],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        usersData: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getUsers',
      functionParams: [
        {
          paramName: 'usersInput',
          paramValue: usersInput,
          paramType: typeof usersInput,
        },
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
      usersData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
