import jwt from 'jsonwebtoken';

import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';

import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';

export default async function getFleets(
  _: any,
  {
    fleetsInput,
  }: {
    fleetsInput: {
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
        functionName: 'getFleets',
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
      functionName: 'getFleets',
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
      functionName: 'getFleets',
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
        functionName: 'getFleets',
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

    const {email} = user.personalDetails;

    // const {paginationArgs, searchText, isPlainText, filteredFields} = fleetsInput;

    // let searchQuery = {};
    // let projectionQuery = {};
    // let sortQuery;

    // if (searchText) {
    //   const searchRegex = new RegExp(searchText, isPlainText ? 'i' : undefined);
    //   const fieldsToSearch = filteredFields.length
    //     ? filteredFields
    //     : [
    //         'name',
    //         'VAT',
    //         'permitHolderName',
    //         'permitNumber',
    //         'permitHolderAddress',
    //         'permitHolderContactDetails',
    //         'ownerEmail',
    //         'prefix',
    //         'individualDocketNumber',
    //       ];

    //   searchQuery = {
    //     $or: fieldsToSearch.map(field => ({[field]: searchRegex})),
    //   };

    //   projectionQuery = {};

    //   sortQuery = {};
    // }

    // if (paginationArgs) {
    //   const {pageNumber, itemsPerPage} = paginationArgs;
    //   const skip = (pageNumber - 1) * itemsPerPage;
    const fleetsArray: any = user?.fleets;
    const fleetIds = fleetsArray.map(fleet => fleet._id);

    const fleets = await Fleet.find({
      _id: {$in: fleetIds},
    });

    //     .select(projectionQuery)
    //     .sort(sortQuery)
    //     .skip(skip)
    //     .limit(itemsPerPage)
    //     .exec();
    // } else {
    //   fleets = await Fleet.find({
    //     $and: [
    //       {
    //         $or: [{ownerEmail: email}, {membersEmails: {$in: [email]}}],
    //       },
    //       searchQuery,
    //     ],
    //   })
    //     .select(projectionQuery)
    //     .sort(sortQuery)
    //     .exec();
    // }

    // const totalFleetsCount = await Fleet.countDocuments({
    //   $and: [
    //     {
    //       $or: [{ownerEmail: email}, {membersEmails: {$in: [email]}}],
    //     },
    //     searchQuery,
    //   ],
    // }).exec();

    if (!fleets) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getFleets',
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

    const PendingInvitations = await FleetInvitation.find({
      inviteeEmail: user?.personalDetails?.email,
      status: 'PENDING',
    });

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getFleets',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      selectedFleet: user?.selectedFleet,
      // totalCount: totalFleetsCount,
      userData: user,
      fleetData: fleets,
      UserPendingInvitations: PendingInvitations,
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
        functionName: 'getFleets',
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
      functionName: 'getFleets',
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
