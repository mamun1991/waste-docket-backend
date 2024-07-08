import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import User from '../../../../MongoModels/User';
import Suggestion from '../../../../MongoModels/Suggestion';
import sendEmail from '../../../../utils/sendEmailHandler';
import TEMPLATES from '../../../../constants/emailTemplateIDs';

export default async function addSuggestion(_: any, {suggestionData}, context: any) {
  const {suggestion} = suggestionData;
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
        functionName: 'addSuggestion',
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
      functionName: 'addSuggestion',
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
      functionName: 'addSuggestion',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId).populate('selectedFleet');
    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addSuggestion',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        message: 'User does not exist',
        status: 404,
      };
    }
    const selectedFleet: any = user?.selectedFleet;
    await Suggestion.create({
      name: user?.personalDetails?.name,
      email: user?.personalDetails?.email,
      suggestion: suggestion,
      user: user?._id,
      fleet: selectedFleet?._id,
      fleetName: selectedFleet?.name,
      fleetOwnerEmail: selectedFleet?.ownerEmail,
    });

    await sendEmail(
      {},
      user?.personalDetails?.email?.toString(),
      TEMPLATES.SUGGESTION.WASTE_DOCKET_THANKS_SUGGESTION,
      'wastedocket@secomind.ai'
    );
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'addSuggestion',
      functionParams: functionParams,
      additionalMessage: 'Add Suggestion mutation Successful.',
      startLogId,
    });

    return {
      status: 200,
      message: 'Add Suggestion mutation Successful.',
    };
  } catch (err) {
    console.log('Error in adding suggestion', err);
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addSuggestion',
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
      functionName: 'addSuggestion',
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
