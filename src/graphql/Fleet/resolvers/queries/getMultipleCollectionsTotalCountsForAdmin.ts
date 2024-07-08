import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import {AccountTypes} from '../../../../constants/enums';
import CustomerContact from '../../../../MongoModels/CustomerContact';
import DestinationFacility from '../../../../MongoModels/DestinationFacility';
import WasteCollectionPermitDocument from '../../../../MongoModels/WasteCollectionPermitDocument';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';
import Subscription from '../../../../MongoModels/Subscription';

export default async function getMultipleCollectionsTotalCountsForAdmin(
  _: any,
  _userInput: any,
  context: any
) {
  let startLogId: String;
  const {token} = context;
  let accessTokenSecret: string;
  let decodedToken: AccessToken;
  const ENV_VALUES = await AwsSecrets.getInstance();
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getMultipleCollectionsTotalCountsForAdmin',
        functionParams: [
          {
            paramName: 'token',
            paramValue: 'HIDDEN_TOKEN',
            paramType: typeof token,
          },
        ],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getMultipleCollectionsTotalCountsForAdmin',
      functionParams: [
        {
          paramName: 'token',
          paramValue: 'HIDDEN_TOKEN',
          paramType: typeof token,
        },
      ],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      response: {
        message: err.message,
        status: 500,
      },
    };
  }

  const functionParams = [
    {
      paramName: 'token',
      paramValue: 'HIDDEN_TOKEN',
      paramType: typeof token,
    },
  ];
  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'getMultipleCollectionsTotalCountsForAdmin',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getMultipleCollectionsTotalCountsForAdmin',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        userData: null,
        response: {
          message: 'User not found',
          status: 404,
        },
      };
    }

    if (user.accountType !== AccountTypes.ADMIN) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllFleetsForAdmin',
        functionParams: functionParams,
        additionalMessage: 'User is not an admin.',
        startLogId,
      });
      return {
        fleetData: null,
        response: {
          message: 'User is not an admin.',
          status: 404,
        },
      };
    }

    const customersCount = await CustomerContact.countDocuments();
    const destinationFacilitiesCount = await DestinationFacility.countDocuments();
    const wastePermitDocumentsCount = await WasteCollectionPermitDocument.countDocuments();
    const invitesCount = await FleetInvitation.countDocuments();
    const subscriptions = await Subscription.countDocuments();

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getMultipleCollectionsTotalCountsForAdmin',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      customersCount: customersCount || 0,
      destinationFacilitiesCount: destinationFacilitiesCount || 0,
      wastePermitDocumentsCount: wastePermitDocumentsCount || 0,
      invitesCount: invitesCount || 0,
      subscriptions: subscriptions || 0,
      response: {
        message: 'Query Successful!',
        status: 200,
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getMultipleCollectionsTotalCountsForAdmin',
        functionParams: functionParams,
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        userData: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getMultipleCollectionsTotalCountsForAdmin',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      userData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
