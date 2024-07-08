import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';
import Docket from '../../../../MongoModels/Docket';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import WasteFacilityRepSignature from '../../../../MongoModels/WasteFacilityRepSignature';
import DriverSignature from '../../../../MongoModels/DriverSignature';
import CustomerSignature from '../../../../MongoModels/CustomerSignature';

export default async function updateDocketSignatures(
  _: any,
  {fleetId, docketId, docketData},
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
        functionName: 'updateDocketSignatures',
        functionParams: [
          {
            paramName: 'docketId',
            paramValue: docketId,
            paramType: typeof docketId,
          },
          {
            paramName: 'fleetId',
            paramValue: fleetId,
            paramType: typeof fleetId,
          },
          {
            paramName: 'docketData',
            paramValue: docketData,
            paramType: typeof docketData,
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
      functionName: 'updateDocketSignatures',
      functionParams: [
        {
          paramName: 'docketId',
          paramValue: docketId,
          paramType: typeof docketId,
        },
        {
          paramName: 'fleetId',
          paramValue: fleetId,
          paramType: typeof fleetId,
        },
        {
          paramName: 'docketData',
          paramValue: docketData,
          paramType: typeof docketData,
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
      paramName: 'docketId',
      paramValue: docketId,
      paramType: typeof docketId,
    },
    {
      paramName: 'fleetId',
      paramValue: fleetId,
      paramType: typeof fleetId,
    },
    {
      paramName: 'docketData',
      paramValue: docketData,
      paramType: typeof docketData,
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
      functionName: 'updateDocketSignatures',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateDocketSignatures',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        message: 'User not found',
        status: 404,
      };
    }

    const fleet = await Fleet.findById(fleetId);

    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateDocketSignatures',
        functionParams: functionParams,
        additionalMessage: 'Fleets not found',
        startLogId,
      });
      return {
        message: 'Fleets not found',
        status: 404,
      };
    }

    const existingDocket: any = await Docket.findById(docketId)
      .lean()
      .populate('fleet', 'name id')
      .populate('user', 'name');
    let wasteFacilityRepSignatureDocument;
    if (docketData?.isWasteFacilityRepSignatureId) {
      wasteFacilityRepSignatureDocument = await WasteFacilityRepSignature.findOne({
        _id: docketData?.wasteFacilityRepSignature,
      });
    }
    let driverSignatureDocument;
    if (docketData?.isDriverSignatureId) {
      driverSignatureDocument = await DriverSignature.findOne({
        _id: docketData?.driverSignature,
      });
    }
    let customerSignatureDocument;
    if (docketData?.isCustomerSignatureId) {
      customerSignatureDocument = await CustomerSignature.findOne({
        _id: docketData?.customerSignature,
      });
    }

    await Docket.findByIdAndUpdate(docketId, {
      $set: {
        'docketData.wasteFacilityRepSignature':
          docketData?.wasteFacilityRepSignature === 'clear'
            ? ''
            : docketData?.isWasteFacilityRepSignatureId
            ? wasteFacilityRepSignatureDocument?.signatureUrl
            : docketData?.wasteFacilityRepSignature ||
              existingDocket?.docketData?.wasteFacilityRepSignature,
        'docketData.driverSignature':
          docketData?.driverSignature === 'clear'
            ? ''
            : docketData?.isDriverSignatureId
            ? driverSignatureDocument?.signatureUrl
            : docketData?.driverSignature || existingDocket?.docketData?.driverSignature,
        'docketData.customerSignature':
          docketData?.customerSignature === 'clear'
            ? ''
            : docketData?.isCustomerSignatureId
            ? customerSignatureDocument?.signatureUrl
            : docketData?.customerSignature || existingDocket?.docketData?.customerSignature,
      },
    });

    if (docketData?.isWasteFacilityRepSignatureId) {
      await WasteFacilityRepSignature.deleteOne({
        _id: docketData?.wasteFacilityRepSignature,
      });
    }
    if (docketData?.isDriverSignatureId) {
      await DriverSignature.deleteOne({
        _id: docketData?.driverSignature,
      });
    }
    if (docketData?.isCustomerSignatureId) {
      await CustomerSignature.deleteOne({
        _id: docketData?.customerSignature,
      });
    }

    const updatedSignatureSuccessMessage = docketData?.wasteFacilityRepSignature
      ? 'Destination Signature has been added successfully.'
      : docketData.driverSignature
      ? 'Driver Signature has been added successfully.'
      : docketData?.customerSignature
      ? 'Customer Signature has been added successfully.'
      : 'Docket has been updated.';
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'updateDocketSignatures',
      functionParams: functionParams,
      additionalMessage: updatedSignatureSuccessMessage,
      startLogId,
    });
    console.log('(updateDocketSignatures) ==> ', updatedSignatureSuccessMessage);
    return {
      message: updatedSignatureSuccessMessage,
      status: 200,
    };
  } catch (err) {
    console.log('Error While Update Docket Signature', err);
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateDocketSignatures',
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
      functionName: 'updateDocketSignatures',
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
