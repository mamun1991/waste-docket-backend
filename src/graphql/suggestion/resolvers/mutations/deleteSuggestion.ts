import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import User from '../../../../MongoModels/User';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import {AccountTypes} from '../../../../constants/enums';
import Suggestion from '../../../../MongoModels/Suggestion';

export default async function deleteSuggestion(
  _: any,
  {suggestionId, doDeleteAll},
  context: {token: string}
) {
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
        paramName: 'suggestionId',
        paramValue: suggestionId,
        paramType: typeof suggestionId,
      },
      {
        paramName: 'doDeleteAll',
        paramValue: doDeleteAll,
        paramType: typeof doDeleteAll,
      },
    ];
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'deleteSuggestion',
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
      functionName: 'deleteSuggestion',
      functionParams: functionParams,
    });

    const adminUser = await User.findById(decodedToken.UserId);

    if (!adminUser) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteSuggestion',
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
        functionName: 'deleteSuggestion',
        functionParams: functionParams,
        additionalMessage: 'User is not an admin.',
        startLogId,
      });
      return {
        message: 'User is not an admin.',
        status: 404,
      };
    }

    if (!doDeleteAll) {
      const suggestion = await Suggestion.findById(suggestionId);
      if (!suggestion) {
        await createApiLog({
          type: ApiLogTypes.QUERY_END,
          level: ApiLogLevels.ERROR,
          functionName: 'deleteSuggestion',
          functionParams: functionParams,
          additionalMessage: 'Suggestion does not exist',
          startLogId,
        });

        return {
          message: 'Suggestion does not exist',
          status: 404,
        };
      }
    }
    if (!doDeleteAll) {
      await Suggestion.findByIdAndDelete(suggestionId);
    } else {
      await Suggestion.deleteMany();
    }
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'deleteSuggestion',
      functionParams: functionParams,
      additionalMessage: 'Suggestion Deleted Successfully',
      startLogId,
    });

    return {
      message: 'Suggestion Deleted Successfully',
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteSuggestion',
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
      functionName: 'deleteSuggestion',
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
