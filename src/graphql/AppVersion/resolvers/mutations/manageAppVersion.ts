import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import User from '../../../../MongoModels/User';
import AppVersion from '../../../../MongoModels/appVersion';
import {AccountTypes} from '../../../../constants/enums';

export default async function manageAppVersion(_: any, {appVersionData}, context: any) {
  const {androidLatestVersion, isAndroidUpgradeMandatory, iosLatestVersion, isIosUpgradeMandatory} =
    appVersionData;
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
      paramName: 'androidLatestVersion',
      paramValue: androidLatestVersion,
      paramType: typeof androidLatestVersion,
    },
    {
      paramName: 'isAndroidUpgradeMandatory',
      paramValue: isAndroidUpgradeMandatory,
      paramType: typeof isAndroidUpgradeMandatory,
    },
    {
      paramName: 'iosLatestVersion',
      paramValue: iosLatestVersion,
      paramType: typeof iosLatestVersion,
    },
    {
      paramName: 'isIosUpgradeMandatory',
      paramValue: isIosUpgradeMandatory,
      paramType: typeof isIosUpgradeMandatory,
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
        functionName: 'manageAppVersion',
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
      functionName: 'manageAppVersion',
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
      functionName: 'manageAppVersion',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId);
    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'manageAppVersion',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        message: 'User does not exist',
        status: 404,
      };
    }

    if (user.accountType !== AccountTypes.ADMIN) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'manageAppVersion',
        functionParams: [
          {
            paramName: 'userId',
            paramValue: decodedToken.UserId,
            paramType: typeof decodedToken.UserId,
          },
        ],
        additionalMessage: 'User is not an admin.',
        startLogId,
      });
      return {
        message: 'User is not an admin.',
        status: 403,
      };
    }

    let appVersion = await AppVersion.findOne().sort({createdAt: 1});

    if (!appVersion) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'manageAppVersion',
        functionParams: functionParams,
        additionalMessage: 'App version not exist, creating new.',
        startLogId,
      });
      appVersion = await AppVersion.create({
        androidLatestVersion,
        isAndroidUpgradeMandatory,
        iosLatestVersion,
        isIosUpgradeMandatory,
        user: user?._id,
      });
    } else {
      await AppVersion.updateOne(
        {},
        {
          androidLatestVersion,
          isAndroidUpgradeMandatory,
          iosLatestVersion,
          isIosUpgradeMandatory,
          lastUpdatedBy: user?._id,
        }
      );
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'manageAppVersion',
      functionParams: functionParams,
      additionalMessage: 'App Version Updated Successfully.',
      startLogId,
    });

    return {
      status: 200,
      message: 'App Version Updated Successfully.',
    };
  } catch (err) {
    console.log('Error in updating app version', err);
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'manageAppVersion',
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
      functionName: 'manageAppVersion',
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
