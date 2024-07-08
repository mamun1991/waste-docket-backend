import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import CustomerContact from '../../../../MongoModels/CustomerContact';
import Fleet from '../../../../MongoModels/Fleet';

export default async function getCustomerContactsByFleetIdWithSorting(
  _: any,
  {
    customersInput,
    fleetId,
  }: {
    fleetId: string;
    customersInput: {
      sortColumn: string;
      sortOrder: string;
      pageNumber: number;
      itemsPerPage: number;
      searchText: string;
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
        functionName: 'getCustomerContactsByFleetIdWithSorting',
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
      functionName: 'getCustomerContactsByFleetIdWithSorting',
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
      functionName: 'getCustomerContactsByFleetIdWithSorting',
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
        functionName: 'getCustomerContactsByFleetIdWithSorting',
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
    const {searchText, sortColumn, sortOrder, pageNumber, itemsPerPage} = customersInput;

    let searchQuery = {};

    if (searchText) {
      const searchRegex = new RegExp(`^${searchText}`, 'i');
      const fieldsToSearch = customersInput?.searchKeyword
        ? [customersInput?.searchKeyword]
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
    }

    let sorts = {
      asc: 1,
      desc: -1,
    };

    let customers;

    const skip = (pageNumber - 1) * itemsPerPage;
    customers = await CustomerContact.find({
      $and: [{fleet: fleetId}, searchQuery],
    })
      .sort({
        [sortColumn]: sorts[sortOrder as 'asc' | 'desc'] as 1 | -1,
      })
      .collation({locale: 'en', strength: 2})
      .skip(skip)
      .limit(itemsPerPage)
      .exec();

    const totalCustomerCount = await CustomerContact.countDocuments({
      $and: [{fleet: fleetId}, searchQuery],
    }).exec();

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getCustomerContactsByFleetIdWithSorting',
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
        functionName: 'getCustomerContactsByFleetIdWithSorting',
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
      functionName: 'getCustomerContactsByFleetIdWithSorting',
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
