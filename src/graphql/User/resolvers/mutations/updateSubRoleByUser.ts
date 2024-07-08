import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import User from '../../../../MongoModels/User';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import {AccountSubTypes} from '../../../../constants/enums';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';
import Fleet from '../../../../MongoModels/Fleet';

export default async function updateSubRoleByUser(_: any, {subRole}, context: {token: string}) {
  let startLogId: String;
  const {token} = context;

  let accessTokenSecret: string;
  let decodedToken: any;
  const ENV_VALUES = await AwsSecrets.getInstance();

  let functionParams;
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
    functionParams = [
      {
        paramName: 'userId',
        paramValue: decodedToken.UserId,
        paramType: typeof decodedToken.UserId,
      },
      {
        paramName: 'subRole',
        paramValue: subRole,
        paramType: typeof subRole,
      },
    ];
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'updateSubRoleByUser',
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
      type: ApiLogTypes.MUTATION_START,
      level: ApiLogLevels.INFO,
      functionName: 'updateSubRoleByUser',
      functionParams: functionParams,
    });

    const currentUser = await User.findById(decodedToken.UserId);

    if (!currentUser) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateSubRoleByUser',
        functionParams: functionParams,
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        message: 'User does not exist',
        status: 404,
      };
    }
    await User.findByIdAndUpdate(currentUser?._id, {
      accountSubType: subRole,
    });

    if (subRole === AccountSubTypes.BUSINESS_ADMIN) {
      const invitationsToDelete = await FleetInvitation.find({
        userId: currentUser?._id,
      });
      const deleteResult = await FleetInvitation.deleteMany({
        userId: currentUser?._id,
      });
      const deleteCount = deleteResult.deletedCount || 0;
      if (deleteCount > 0) {
        const fleetIds = invitationsToDelete.map(invitation => invitation.fleetId);
        await Fleet.updateMany(
          {_id: {$in: fleetIds}},
          {$pull: {invitations: {$in: invitationsToDelete.map(invitation => invitation._id)}}}
        );
        await User.updateOne(
          {_id: currentUser._id},
          {$pull: {invitations: {$in: invitationsToDelete.map(invitation => invitation._id)}}}
        );
      }
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'updateSubRoleByUser',
      functionParams: functionParams,
      additionalMessage: 'User Sub Role has been updated Successfully',
      startLogId,
    });

    return {
      message: 'User Sub Role has been updatedSuccessfully',
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateSubRoleByUser',
        functionParams: [],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'updateSubRoleByUser',
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
