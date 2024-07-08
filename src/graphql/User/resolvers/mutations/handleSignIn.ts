import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';

export default async function handleSignIn(
  parent: any,
  {email}: any,
  context: {token: string},
  info: any
) {
  let startLogId: String;
  const ENV_VALUES = await AwsSecrets.getInstance();

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.MUTATION_START,
      level: ApiLogLevels.INFO,
      functionName: 'handleSignIn',
      functionParams: [{paramName: 'userData', paramValue: email, paramType: typeof email}],
    });
    if (context.token !== ENV_VALUES.BACKEND_API_KEY) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'handleSignIn',
        functionParams: [
          {
            paramName: 'userData',
            paramValue: email,
            paramType: typeof email,
          },
        ],
        additionalMessage: 'Invalid Permissions: Invalid BACKEND_API_KEY',
        startLogId,
      });

      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }
    const existingUser = await User.findOne({
      'personalDetails.email': email,
    });

    if (!existingUser) {
      const newUser = await User.create(email);

      const userId = newUser._id.valueOf();
      const accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
      const token = jwt.sign({UserId: userId}, accessTokenSecret, {
        algorithm: 'HS256',
        expiresIn: '7d',
      });

      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.INFO,
        functionName: 'handleSignIn',
        functionParams: [
          {
            paramName: 'userData',
            paramValue: email,
            paramType: typeof email,
          },
        ],
        additionalMessage: `User Created: ${email} - ID: ${userId}`,
        startLogId,
      });

      return {
        message: token,
        status: 200,
      };
    }

    if (existingUser) {
      const accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
      const token = jwt.sign({UserId: existingUser._id}, accessTokenSecret, {
        algorithm: 'HS256',
        expiresIn: '7d',
      });

      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.INFO,
        functionName: 'handleSignIn',
        functionParams: [
          {
            paramName: 'userData',
            paramValue: email,
            paramType: typeof email,
          },
        ],
        additionalMessage: `Token Generated`,
        startLogId,
      });
      return {
        message: token,
        status: 200,
      };
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'handleSignIn',
      functionParams: [{paramName: 'userData', paramValue: email, paramType: typeof email}],
      additionalMessage: 'User Not Found',
      startLogId,
    });

    return {
      message: 'User Not Found',
      status: 404,
    };
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'handleSignIn',
      functionParams: [{paramName: 'userData', paramValue: email, paramType: typeof email}],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      message: 'Unknown Error',
      status: 500,
    };
  }
}
