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

export default async function deleteCollectionsDataByAdmin(_: any, {collection}, context: any) {
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
        functionName: 'deleteCollectionsDataByAdmin',
        functionParams: [
          {
            paramName: 'collection',
            paramValue: collection,
            paramType: typeof collection,
          },

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
        message: 'Not Authenticated',
        status: 401,
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'deleteCollectionsDataByAdmin',
      functionParams: [
        {
          paramName: 'collection',
          paramValue: collection,
          paramType: typeof collection,
        },
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
      message: err.message,
      status: 500,
    };
  }

  const functionParams = [
    {
      paramName: 'collection',
      paramValue: collection,
      paramType: typeof collection,
    },
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
      functionName: 'deleteCollectionsDataByAdmin',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteCollectionsDataByAdmin',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        message: 'User not found',
        status: 404,
      };
    }

    if (user.accountType !== AccountTypes.ADMIN) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteCollectionsDataByAdmin',
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
        fleetData: null,
        response: {
          message: 'User is not an admin.',
          status: 404,
        },
      };
    }

    if (collection === 'Customers') {
      await CustomerContact.deleteMany();
    } else if (collection === 'Destination Facilities') {
      await DestinationFacility.deleteMany();
    } else if (collection === 'Waste Permit Documents') {
      await WasteCollectionPermitDocument.deleteMany();
    } else if (collection === 'Invites') {
      await FleetInvitation.deleteMany();
    } else if (collection === 'Subscriptions') {
      await Subscription.deleteMany();
    } else {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteCollectionsDataByAdmin',
        functionParams: [
          {
            paramName: 'userId',
            paramValue: decodedToken.UserId,
            paramType: typeof decodedToken.UserId,
          },
        ],
        additionalMessage: 'Collection not found',
        startLogId,
      });
      return {
        fleetData: null,
        response: {
          message: 'Collection not found.',
          status: 404,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'deleteCollectionsDataByAdmin',
      functionParams: functionParams,
      additionalMessage: `${collection} Collection has been cleaned.`,
      startLogId,
    });

    return {
      message: `${collection} Collection has been cleaned.`,
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteCollectionsDataByAdmin',
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
      functionName: 'deleteCollectionsDataByAdmin',
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
