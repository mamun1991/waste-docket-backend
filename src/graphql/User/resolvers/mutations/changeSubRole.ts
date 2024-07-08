import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import User from '../../../../MongoModels/User';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import {AccountTypes} from '../../../../constants/enums';

export default async function changeSubRole(_: any, {userId, subRole}, context: {token: string}) {
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
      functionName: 'changeSubRole',
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
      functionName: 'changeSubRole',
      functionParams: functionParams,
    });

    const adminUser = await User.findById(decodedToken.UserId);

    if (!adminUser) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'changeSubRole',
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
        functionName: 'changeSubRole',
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
        functionName: 'changeSubRole',
        functionParams: functionParams,
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        message: 'User does not exist',
        status: 404,
      };
    }

    await User.findByIdAndUpdate(userId, {
      accountSubType: subRole,
    });

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'changeSubRole',
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
        functionName: 'changeSubRole',
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
      functionName: 'changeSubRole',
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
