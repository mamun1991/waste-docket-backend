import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import CustomerContact from '../../../../MongoModels/CustomerContact';
import Fleet from '../../../../MongoModels/Fleet';

export default async function getCustomerContactsByFleetId(
  _: any,
  {
    customersInput,
    fleetId,
  }: {
    fleetId: string;
    customersInput: {
      paginationArgs: {pageNumber: number; itemsPerPage: number};
      searchText: string;
      isPlainText: string;
      filteredFields: [string];
      searchKeyword: string;
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
        functionName: 'getCustomerContactsByFleetId',
        functionParams: [
          {
            paramName: 'customersInput',
            paramValue: customersInput,
            paramType: typeof customersInput,
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
      functionName: 'getCustomerContactsByFleetId',
      functionParams: [
        {
          paramName: 'customersInput',
          paramValue: customersInput,
          paramType: typeof customersInput,
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
      paramName: 'customersInput',
      paramValue: customersInput,
      paramType: typeof customersInput,
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
      functionName: 'getCustomerContactsByFleetId',
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
        functionName: 'getCustomerContactsByFleetId',
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
    const {paginationArgs, searchText, isPlainText, filteredFields} = customersInput;

    let searchQuery = {};
    let projectionQuery = {};
    let sortQuery;

    if (searchText) {
      const searchRegex = new RegExp(`^${searchText}`, isPlainText ? 'i' : undefined);
      const fieldsToSearch = customersInput?.searchKeyword
        ? [customersInput?.searchKeyword]
        : filteredFields?.length
        ? filteredFields
        : [
            'customerName',
            'customerPhone',
            'customerEmail',
            'customerAddress',
            'customerId',
            'customerStreet',
            'customerCity',
            'customerCounty',
            'customerEircode',
            'customerCountry',
          ];

      searchQuery = {
        $or: fieldsToSearch.map(field => ({[field]: searchRegex})),
      };

      projectionQuery = {};

      sortQuery = {};
    }

    let customers;
    console.log(paginationArgs, '(getCustomerContactsByFleetId) ==> paginationArgs');
    if (paginationArgs) {
      const {pageNumber, itemsPerPage} = paginationArgs;
      const skip = (pageNumber - 1) * itemsPerPage;
      customers = await CustomerContact.find({
        $and: [{fleet: fleetId}, searchQuery],
      })
        .select(projectionQuery)
        .sort(sortQuery)
        .skip(skip)
        .limit(itemsPerPage)
        .exec();
    } else {
      customers = await CustomerContact.find({
        $and: [{fleet: fleetId}, searchQuery],
      })
        .select(projectionQuery)
        .sort(sortQuery)
        .exec();
    }

    const totalCustomerCount = await CustomerContact.countDocuments({
      $and: [{fleet: fleetId}, searchQuery],
    }).exec();

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getCustomerContactsByFleetId',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      totalCount: totalCustomerCount,
      customersData: customers,
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
        functionName: 'getCustomerContactsByFleetId',
        functionParams: functionParams,
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        customerData: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getCustomerContactsByFleetId',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      customerData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
