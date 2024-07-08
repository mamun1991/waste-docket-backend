import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import Fleet from '../../../../MongoModels/Fleet';
import User from '../../../../MongoModels/User';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Docket from '../../../../MongoModels/Docket';

export default async function deleteFleet(_: any, {fleetId}, context: {token: string}) {
  let startLogId: String;
  const {token} = context;

  let accessTokenSecret: string;
  let decodedToken: any;
  const ENV_VALUES = await AwsSecrets.getInstance();
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'deleteFleet',
      functionParams: [
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
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
      functionName: 'deleteFleet',
      functionParams: [
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
    });
    const fleet = await Fleet.findById(fleetId);

    if (!fleetId || !fleet) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateFleet',
        functionParams: [
          {
            paramName: 'fleetId',
            paramValue: fleetId,
            paramType: typeof fleetId,
          },
          {
            paramName: 'userId',
            paramValue: decodedToken.UserId,
            paramType: typeof decodedToken.UserId,
          },
        ],
        additionalMessage: 'Invalid Fleet Id.',
        startLogId,
      });
      return {
        message: 'Invalid Fleet Id.',
        status: 400,
      };
    }

    const user = await User.findById(decodedToken.UserId);

    if (user.personalDetails.email !== fleet.ownerEmail) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.INFO,
        functionName: 'deleteFleet',
        functionParams: [
          {
            paramName: 'userId',
            paramValue: decodedToken.UserId,
            paramType: typeof decodedToken.UserId,
          },
        ],
        additionalMessage: 'Fleet Doest Not Belong To User',
        startLogId,
      });
      return {
        message: 'Fleet Doest Not Belong To User',
        status: 400,
      };
    }
    await Fleet.findByIdAndDelete(fleetId);
    await User.updateMany({$pull: {fleets: fleetId}});
    await FleetInvitation.updateMany(
      {
        fleetId: fleetId,
        status: 'PENDING',
      },
      {status: 'FLEET_DELETED'}
    );

    await Docket.deleteMany({fleet: fleetId});

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'deleteFleet',
      functionParams: [
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
      additionalMessage: 'Fleet Deleted Successfully',
      startLogId,
    });

    return {
      message: 'Fleet Deleted Successfully',
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteFleet',
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
      functionName: 'deleteFleet',
      functionParams: [
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      message: err.message,
      status: 500,
    };
  }
}
