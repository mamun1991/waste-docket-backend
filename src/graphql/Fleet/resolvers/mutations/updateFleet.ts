import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import Docket from '../../../../MongoModels/Docket';

export default async function updateFleet(_: any, {fleetId, fleetData}, context: any) {
  const {name, VAT, permitNumber, allowedWaste} = fleetData;
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
      paramName: 'name',
      paramValue: name,
      paramType: typeof name,
    },
    {
      paramName: 'VAT',
      paramValue: VAT,
      paramType: typeof VAT,
    },
    {
      paramName: 'permitNumber',
      paramValue: permitNumber,
      paramType: typeof permitNumber,
    },
    {
      paramName: 'allowedWaste',
      paramValue: allowedWaste,
      paramType: typeof allowedWaste,
    },
  ];
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
    if (!decodedToken) {
      return {
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateFleet',
        functionParams: functionParams,
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
      functionName: 'updateFleet',
      functionParams: functionParams,
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

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'updateFleet',
      functionParams: functionParams,
    });

    if (!(permitNumber && name && VAT)) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: 'Please Provide Name, VAT and Permit Number for Business Type.',
        startLogId,
      });

      return {
        response: {
          status: 500,
          message: 'Please Provide Name, VAT and Permit Number for Business Type.',
        },
      };
    }

    const existFleet = await Fleet.findOne({_id: fleetId});

    if (!existFleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: 'Fleet Does Not Exist',
        startLogId,
      });

      return {
        response: {
          status: 500,
          message: 'Fleet Does Not Exist',
        },
      };
    }

    const dockets = await Docket.find({fleet: fleetId});
    const docketNumber =
      dockets && dockets?.length > 0 ? existFleet?.docketNumber : fleetData?.docketNumber;
    const fleet = await Fleet.findByIdAndUpdate(
      fleetId,
      {
        $set: {
          ...fleetData,
          docketNumber,
        },
      },
      {strict: false}
    );

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'updateFleet',
      functionParams: functionParams,
      additionalMessage: 'Fleet Updated Successfully',
      startLogId,
    });

    return {
      response: {
        status: 200,
        message: 'Fleet Updated Successfully',
      },
      fleet: fleet,
    };

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'updateFleet',
      functionParams: functionParams,
      additionalMessage: 'Query Unsuccessful | isBusiness or isIndividual must be true',
      startLogId,
    });

    return {
      response: {
        status: 500,
        message: 'Query Unsuccessful | isBusiness or isIndividual must be true',
      },
      pendingInvites: [],
      fleets: [],
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateFleet',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
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
      functionName: 'updateFleet',
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
