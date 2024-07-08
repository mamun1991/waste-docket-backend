import jwt from 'jsonwebtoken';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import User from '../../../../MongoModels/User';

export default async function emailBypassOTP(_: any, {email}: {email: string}) {
  let startLogId: String;
  const ENV_VALUES = await AwsSecrets.getInstance();
  console.log('email', email);
  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.MUTATION_START,
      level: ApiLogLevels.INFO,
      functionName: 'emailBypassOTP',
      functionParams: [{paramName: 'email', paramValue: email, paramType: typeof email}],
    });

    if (email === 'business.wastedocket@gmail.com' || email === 'driver.wastedocket@gmail.com') {
      const user = await User.findOne({'personalDetails.email': email})
        .populate('fleets')
        .populate('invitations');

      const accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
      const token = jwt.sign({UserId: user._id}, accessTokenSecret, {
        algorithm: 'HS256',
        expiresIn: '7d',
      });

      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.INFO,
        functionName: 'emailBypassOTP',
        functionParams: [{paramName: 'email', paramValue: email, paramType: typeof email}],
        additionalMessage: 'emailBypassOTP',
        startLogId,
      });

      return {
        email,
        token,
        user,
        response: {
          message: 'emailBypassOTP',
          status: 200,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'emailBypassOTP',
      functionParams: [{paramName: 'email', paramValue: email, paramType: typeof email}],
      additionalMessage: 'Unauthorized Email',
      startLogId,
    });

    return {
      response: {
        message: 'Unauthorized Email',
        status: 500,
      },
    };
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'emailBypassOTP',
      functionParams: [{paramName: 'email', paramValue: email, paramType: typeof email}],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      response: {
        message: 'Unknown Error',
        status: 500,
      },
    };
  }
}
