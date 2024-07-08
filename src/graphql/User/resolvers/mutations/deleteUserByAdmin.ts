import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import Fleet from '../../../../MongoModels/Fleet';
import User from '../../../../MongoModels/User';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import {AccountTypes} from '../../../../constants/enums';
import Docket from '../../../../MongoModels/Docket';
import Subscription from '../../../../MongoModels/Subscription';
import DestinationFacility from '../../../../MongoModels/DestinationFacility';
import CustomerContact from '../../../../MongoModels/CustomerContact';
import WasteCollectionPermitDocument from '../../../../MongoModels/WasteCollectionPermitDocument';

export default async function deleteUserByAdmin(_: any, {userId}, context: {token: string}) {
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
    ];
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'deleteUserByAdmin',
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
      functionName: 'deleteUserByAdmin',
      functionParams: functionParams,
    });

    const adminUser = await User.findById(decodedToken.UserId);

    if (!adminUser) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteUserByAdmin',
        functionParams: functionParams,
        additionalMessage: 'Admin User does not exist',
        startLogId,
      });

      return {
        message: 'Admin User does not exist',
        status: 404,
      };
    }

    if (adminUser.accountType !== AccountTypes.ADMIN) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteUserByAdmin',
        functionParams: functionParams,
        additionalMessage: 'User is not an admin.',
        startLogId,
      });
      return {
        message: 'User is not an admin.',
        status: 404,
      };
    }

    const user = await User.findById(userId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteUserByAdmin',
        functionParams: functionParams,
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        message: 'User does not exist',
        status: 404,
      };
    }

    user.fleets.forEach(async fleetId => {
      const fleet = await Fleet.findById(fleetId);
      if (fleet.ownerEmail === user.personalDetails.email) {
        await Fleet.findByIdAndDelete(fleetId);
        await User.updateMany({$pull: {fleets: fleetId}});
        await FleetInvitation.deleteMany({
          fleetId: fleetId,
        });
        await DestinationFacility.deleteMany({fleet: fleetId});
        await CustomerContact.deleteMany({fleet: fleetId});
        await WasteCollectionPermitDocument.deleteMany({fleet: fleetId});
        await Docket.deleteMany({fleet: fleetId});
      } else {
        await Fleet.updateOne({_id: fleetId}, {$pull: {membersEmails: user.personalDetails.email}});
      }
    });

    await User.findByIdAndDelete(userId);

    await Subscription.findOneAndDelete({user: userId});

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'deleteUserByAdmin',
      functionParams: functionParams,
      additionalMessage: 'User Account Deleted Successfully',
      startLogId,
    });

    return {
      message: 'User Account Deleted Successfully',
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteUserByAdmin',
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
      functionName: 'deleteUserByAdmin',
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
