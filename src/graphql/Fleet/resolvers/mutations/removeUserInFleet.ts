import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import User from '../../../../MongoModels/User';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';

export default async function removeUserInFleet(_: any, {fleetId, email}, context: any) {
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
      paramName: 'email',
      paramValue: email,
      paramType: typeof email,
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
        functionName: 'removeUserInFleet',
        functionParams: functionParams,
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
      functionName: 'removeUserInFleet',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      message: err.message,
      status: 500,
    };
  }

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'removeUserInFleet',
      functionParams: functionParams,
    });

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
        message: 'User does not exist',
        status: 404,
      };
    }

    const fleet = await Fleet.findOne({
      _id: fleetId,
      membersEmails: {$in: [email]},
    });
    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'removeUserInFleet',
        functionParams: functionParams,
        additionalMessage: `${email} is not a member of fleet.`,
        startLogId,
      });

      return {
        message: `${email} is not a member of fleet.`,
        status: 404,
      };
    }

    if (fleet.ownerEmail !== user.personalDetails.email) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'removeUserInFleet',
        functionParams: functionParams,
        additionalMessage: 'Invalid Permissions: User does not own fleet',
        startLogId,
      });

      return {
        message: 'Invalid Permissions: User does not own fleet',
        status: 401,
      };
    }
    const memberUser = await User.findOne({'personalDetails.email': email});
    
    const invitation = await FleetInvitation.findOneAndDelete({
      inviteeEmail: {
        $regex: new RegExp(email.trim(), 'i'),
      },
      fleetId: fleetId,
      userId: memberUser?._id,
    });

    await Fleet.updateOne(
      {_id: fleetId},
      {$pull: {membersEmails: email, invitations: invitation?._id}}
    );

    if (`${memberUser.selectedFleet}` === fleetId) {
      await User.updateOne(
        {_id: memberUser._id},
        {
          $pull: {fleets: fleetId},
          $set: {selectedFleet: null},
        }
      );
    } else {
      await User.updateOne(
        {_id: memberUser._id},
        {
          $pull: {fleets: fleetId},
        }
      );
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'removeUserInFleet',
      functionParams: functionParams,
      additionalMessage: 'User has been removed from the Fleet.',
      startLogId,
    });

    return {
      status: 200,
      message: 'User has been removed from the Fleet.',
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'removeUserInFleet',
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
      functionName: 'removeUserInFleet',
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
