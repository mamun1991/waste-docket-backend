import User from '../../../../MongoModels/User';
import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import {AccountTypes} from '../../../../constants/enums';
import AwsSecrets from '../../../../utils/getAwsSecrets';

export default async function addNewUser(
  parent: any,
  {userData}: any,
  context: {token: string},
  info: any
) {
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
      functionName: 'AddNewUser',
      functionParams: [
        {paramName: 'userData', paramValue: userData, paramType: typeof userData},
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
      functionName: 'AddNewUser',
      functionParams: [
        {paramName: 'userData', paramValue: userData, paramType: typeof userData},
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
    });

    const user = await User.findById(decodedToken.UserId);
    if (user?.accountType !== AccountTypes.ADMIN) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.INFO,
        functionName: 'addNewUser',
        functionParams: [
          {
            paramName: 'addNewUser',
            paramValue: userData,
            paramType: typeof userData,
          },
          {
            paramName: 'userId',
            paramValue: decodedToken.UserId,
            paramType: typeof decodedToken.UserId,
          },
        ],
        additionalMessage: 'Not Authenticated !',
        startLogId,
      });
      return {
        message: 'Not Authenticated !',
        status: 400,
      };
    }
    if (userData.operatorId === '') delete userData?.operatorId;

    const userExisted = await User.exists({
      'personalDetails.email': userData?.personalDetails?.email,
    });

    if (userExisted) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.INFO,
        functionName: 'addNewUser',
        functionParams: [
          {
            paramName: 'addNewUser',
            paramValue: userData,
            paramType: typeof userData,
          },
          {
            paramName: 'userId',
            paramValue: decodedToken.UserId,
            paramType: typeof decodedToken.UserId,
          },
        ],
        additionalMessage: 'User already existed with this Email!',
        startLogId,
      });
      return {
        message: 'User already existed with this Email!',
        status: 400,
      };
    }

    if (userData.personalDetails.phone) {
      userData.personalDetails.phone = userData.personalDetails.phone.trim().replace('-', '');
    }

    if (userData.personalDetails.email) {
      userData.personalDetails.email = userData.personalDetails.email.trim();
    }

    await User.create(userData);

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'AddNewUser',
      functionParams: [
        {paramName: 'userData', paramValue: userData, paramType: typeof userData},
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
      additionalMessage: 'New User Added Successfully.',
      startLogId,
    });

    return {
      message: 'New User Added Successfully.',
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'AddNewUser',
        functionParams: [
          {
            paramName: 'userData',
            paramValue: userData,
            paramType: typeof userData,
          },
        ],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }

    if (err?._message === 'User validation failed') {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'AddNewUser',
        functionParams: [
          {
            paramName: 'userData',
            paramValue: userData,
            paramType: typeof userData,
          },
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
        status: 400,
      };
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'AddNewUser',
      functionParams: [
        {paramName: 'userData', paramValue: userData, paramType: typeof userData},
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
