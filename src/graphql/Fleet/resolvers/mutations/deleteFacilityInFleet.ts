import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import User from '../../../../MongoModels/User';
import DestinationFacility from '../../../../MongoModels/DestinationFacility';

function isUserInFleet(fleet, user) {
  const userEmail = user.personalDetails.email;
  const {ownerEmail} = fleet;

  const memberEmails = fleet.membersEmails;

  return ownerEmail === userEmail || memberEmails.includes(userEmail);
}

export default async function deleteFacilityInFleet(_: any, {fleetId, facilityId}, context: any) {
  let startLogId: String = '';
  const {token} = context;
  let accessTokenSecret: string;
  let decodedToken: AccessToken;
  const ENV_VALUES = await AwsSecrets.getInstance();
  const functionParams = [
    {
      paramName: 'token',
      paramValue: 'HIDDEN_TOKEN',
      paramType: typeof token,
    },
    {
      paramName: 'facilityId',
      paramValue: facilityId,
      paramType: typeof facilityId,
    },
    {
      paramName: 'fleetId',
      paramValue: fleetId,
      paramType: typeof fleetId,
    },
  ];

  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
    if (!decodedToken) {
      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteFacilityInFleet',
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
      functionName: 'deleteFacilityInFleet',
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

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'deleteFacilityInFleet',
      functionParams: functionParams,
    });

    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'deleteFacilityInFleet',
        functionParams: functionParams,
        additionalMessage: 'Fleet Does Not Exist',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'Fleet Does Not Exist',
        },
      };
    }

    const user = await User.findById(decodedToken.UserId);
    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getPendingInvitationsByToken',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        response: {
          message: 'User does not exist',
          status: 404,
        },
      };
    }

    const isInFleet = isUserInFleet(fleet, user);

    if (!isInFleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'deleteFacilityInFleet',
        functionParams: functionParams,
        additionalMessage: 'User is not in the fleet.',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'User is not in the fleet.',
        },
      };
    }

    const facility = await DestinationFacility.findById(facilityId);

    if (!facility) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'deleteFacilityInFleet',
        functionParams: functionParams,
        additionalMessage: 'Destination Facility does not exist.',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'Destination Facility does not exist.',
        },
      };
    }

    await DestinationFacility.findByIdAndDelete(facilityId);

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'deleteFacilityInFleet',
      functionParams: functionParams,
      additionalMessage: 'Destination Facility Deleted Successfully.',
      startLogId,
    });

    return {
      response: {
        status: 200,
        message: 'Destination Facility Deleted Successfully.',
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteFacilityInFleet',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'deleteFacilityInFleet',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      message: err.message,
      status: 500,
    };
  }
}
