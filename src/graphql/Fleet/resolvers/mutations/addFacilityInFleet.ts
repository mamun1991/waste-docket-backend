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

export default async function addFacilityInFleet(_: any, {fleetId, facilityData}, context: any) {
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
        functionName: 'addFacilityInFleet',
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
      functionName: 'addFacilityInFleet',
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
      functionName: 'addFacilityInFleet',
      functionParams: functionParams,
    });

    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'addFacilityInFleet',
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
        functionName: 'addFacilityInFleet',
        functionParams: functionParams,
        additionalMessage: 'User is not in fleet',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'User is not in fleet',
        },
      };
    }

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
        functionName: 'addFacilityInFleet',
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

    const destinationFacility = await DestinationFacility.create({
      fleet: fleet._id,
      user: user._id,
      destinationFacilityData: {
        destinationFacilityName: facilityData.destinationFacilityName,
        destinationFacilityAuthorisationNumber: facilityData.destinationFacilityAuthorisationNumber,
        destinationFacilityAddress: facilityData.destinationFacilityAddress,
        destinationFacilityStreet: facilityData.destinationFacilityStreet,
        destinationFacilityCity: facilityData?.destinationFacilityCity,
        destinationFacilityCounty: facilityData?.destinationFacilityCounty,
        destinationFacilityEircode: facilityData?.destinationFacilityEircode,
        destinationFacilityCountry: facilityData?.customerCountry,
        destinationFacilityLatitude: facilityData?.destinationFacilityLatitude,
        destinationFacilityLongitude: facilityData?.destinationFacilityLongitude,
        destinationFacilityId: facilityData.destinationFacilityId,
      },
    });
    console.log(destinationFacility);
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'addFacilityInFleet',
      functionParams: functionParams,
      additionalMessage: 'Destination Facility Created Successfully.',
      startLogId,
    });

    return {
      DestinationFacility: destinationFacility,
      response: {
        status: 200,
        message: 'Destination Facility Created Successfully.',
      },
    };
  } catch (err) {
    console.log('Error in add facility', err);
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addFacilityInFleet',
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
      functionName: 'addFacilityInFleet',
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
