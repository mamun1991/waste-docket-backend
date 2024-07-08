import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';

export default async function getFleetMembersByIdWithSorting(
  _: any,
  {
    memberInputParams,
    fleetId,
  }: {
    fleetId: string;
    memberInputParams: {
      memberSortColumn: string;
      membersSortOrder: string;
      membersPageNumber: number;
      membersItemsPerPage: number;
      pendingMembersSortColumn: string;
      pendingMembersSortOrder: string;
      pendingMembersPageNumber: number;
      pendingMembersItemsPerPage: number;
      doGetMembers: Boolean;
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
        functionName: 'getFleetMembersByIdWithSorting',
        functionParams: [
          {
            paramName: 'fleetId',
            paramValue: fleetId,
            paramType: typeof fleetId,
          },
          {
            paramName: 'memberInputParams',
            paramValue: memberInputParams,
            paramType: typeof memberInputParams,
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
      functionName: 'getFleetMembersByIdWithSorting',
      functionParams: [
        {
          paramName: 'fleetId',
          paramValue: fleetId,
          paramType: typeof fleetId,
        },
        {
          paramName: 'memberInputParams',
          paramValue: memberInputParams,
          paramType: typeof memberInputParams,
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
      paramName: 'fleetId',
      paramValue: fleetId,
      paramType: typeof fleetId,
    },
    {
      paramName: 'memberInputParams',
      paramValue: memberInputParams,
      paramType: typeof memberInputParams,
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
      functionName: 'getFleetMembersByIdWithSorting',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId).populate('fleets');

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getFleetMembersByIdWithSorting',
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

    const fleet = await Fleet.findById(fleetId).populate('invitations');

    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getFleetMembersByIdWithSorting',
        functionParams: functionParams,
        additionalMessage: 'Fleets not found',
        startLogId,
      });
      return {
        fleetData: null,
        membersData: null,
        response: {
          message: 'Fleets not found',
          status: 404,
        },
      };
    }
    const {
      memberSortColumn,
      membersItemsPerPage,
      membersPageNumber,
      membersSortOrder,
      pendingMembersItemsPerPage,
      pendingMembersPageNumber,
      pendingMembersSortColumn,
      pendingMembersSortOrder,
      doGetMembers,
    } = memberInputParams;

    let users;
    let usersCount;
    let pendingFleetInvitations;
    let pendingFleetInvitationsCount;

    let sorts = {
      asc: 1,
      desc: -1,
    };

    if (doGetMembers) {
      users = await User.find({'personalDetails.email': {$in: fleet.membersEmails}})
        .sort({
          [memberSortColumn]: sorts[membersSortOrder as 'asc' | 'desc'] as 1 | -1,
        })
        .collation({locale: 'en', strength: 2})
        .skip(membersPageNumber * membersItemsPerPage - membersItemsPerPage)
        .limit(membersItemsPerPage);
      usersCount = await User.count({'personalDetails.email': {$in: fleet.membersEmails}});
    } else {
      pendingFleetInvitations = await FleetInvitation.find({
        fleetId: fleet._id,
        status: 'PENDING',
      })
        .sort({
          [pendingMembersSortColumn]: sorts[pendingMembersSortOrder as 'asc' | 'desc'] as 1 | -1,
        })
        .collation({locale: 'en', strength: 2})
        .skip(pendingMembersPageNumber * pendingMembersItemsPerPage - pendingMembersItemsPerPage)
        .limit(pendingMembersItemsPerPage);

      pendingFleetInvitationsCount = await FleetInvitation.count({
        fleetId: fleet._id,
        status: 'PENDING',
      });
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getFleetMembersByIdWithSorting',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      fleetData: fleet,
      membersData: users,
      membersCount: usersCount,
      pendingFleetInvitations,
      pendingFleetInvitationsCount,
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
        functionName: 'getFleetMembersByIdWithSorting',
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
      functionName: 'getFleetMembersByIdWithSorting',
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
