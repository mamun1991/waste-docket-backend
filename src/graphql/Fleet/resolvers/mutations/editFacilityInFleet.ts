import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import User from '../../../../MongoModels/User';
import DestinationFacility from '../../../../MongoModels/DestinationFacility';
import escapedRegex from '../../../../utils/escapedRegex';

function isUserInFleet(fleet, user) {
  const userEmail = user.personalDetails.email;
  const {ownerEmail} = fleet;

  const memberEmails = fleet.membersEmails;

  return ownerEmail === userEmail || memberEmails.includes(userEmail);
}

export default async function editFacilityInFleet(
  _: any,
  {fleetId, facilityId, facilityData},
  context: any
) {
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
    {
      paramName: 'facilityData',
      paramValue: facilityData,
      paramType: typeof facilityData,
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
        functionName: 'editFacilityInFleet',
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
      functionName: 'editFacilityInFleet',
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
      functionName: 'editFacilityInFleet',
      functionParams: functionParams,
    });

    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'editFacilityInFleet',
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
        functionName: 'editFacilityInFleet',
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
        functionName: 'editFacilityInFleet',
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

    if (
      facility?.destinationFacilityData?.destinationFacilityId?.toString()?.trim() !==
      facilityData?.destinationFacilityId?.toString()?.trim()
    ) {
      const isFacilityExistInFleetForSameFacilityId = await DestinationFacility.aggregate([
        {
          $match: {
            'destinationFacilityData.destinationFacilityId': {
              $regex: escapedRegex(facilityData?.destinationFacilityId),
            },
            fleet: fleet._id,
          },
        },
      ]);

      if (
        isFacilityExistInFleetForSameFacilityId &&
        isFacilityExistInFleetForSameFacilityId?.length > 0
      ) {
        await createApiLog({
          type: ApiLogTypes.QUERY_END,
          level: ApiLogLevels.INFO,
          functionName: 'editFacilityInFleet',
          functionParams: functionParams,
          additionalMessage: 'Destination facility with this ID already exists.',
          startLogId,
        });

        return {
          response: {
            status: 409,
            message: 'Destination facility with this ID already exists.',
          },
        };
      }
    }

    const updateData = {};
    Object.keys(facilityData).forEach(key => {
      if (facilityData[key] !== undefined) {
        updateData[`destinationFacilityData.${key}`] = facilityData[key];
      }
    });

    const updatedFacility = await DestinationFacility.findOneAndUpdate(
      {_id: facilityId},
      {$set: updateData},
      {new: true}
    );

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'editFacilityInFleet',
      functionParams: functionParams,
      additionalMessage: 'Destination Facility Updated Successfully.',
      startLogId,
    });

    return {
      customerContact: updatedFacility,
      response: {
        status: 200,
        message: 'Destination Facility Updated Successfully.',
      },
    };
  } catch (err) {
    console.log('Error in edit Facility', err);
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'editFacilityInFleet',
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
      functionName: 'editFacilityInFleet',
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
