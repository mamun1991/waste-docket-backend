import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import User from '../../../../MongoModels/User';
import CustomerContact from '../../../../MongoModels/CustomerContact';
import isUserOwnerOfFleet from '../../../../utils/isUserOwnerOfFleet';
import escapedRegex from '../../../../utils/escapedRegex';

export default async function editCustomerInFleet(
  _: any,
  {fleetId, customerId, customerData},
  context: any
) {
  const {customerName, customerEmail, customerAddress} = customerData;
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
      paramName: 'customerId',
      paramValue: customerId,
      paramType: typeof customerId,
    },
    {
      paramName: 'fleetId',
      paramValue: fleetId,
      paramType: typeof fleetId,
    },
    {
      paramName: 'customerData',
      paramValue: customerData,
      paramType: typeof customerData,
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
        functionName: 'editCustomerInFleet',
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
      functionName: 'editCustomerInFleet',
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
      functionName: 'editCustomerInFleet',
      functionParams: functionParams,
    });

    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'editCustomerInFleet',
        functionParams: functionParams,
        additionalMessage: 'Fleet Does Not Exist',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'Fleet Does Not Exist',
        },
      };
    }

    const user = await User.findById(decodedToken.UserId);
    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getPendingInvitationsByToken',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        response: {
          message: 'User does not exist',
          status: 404,
        },
      };
    }

    const isUserOwner = isUserOwnerOfFleet(fleet, user);

    if (!isUserOwner) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'editCustomerInFleet',
        functionParams: functionParams,
        additionalMessage: 'User is not owner of this fleet.',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'User is not owner of this fleet.',
        },
      };
    }

    const customer: any = await CustomerContact.findById(customerId);

    if (!customer) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'editCustomerInFleet',
        functionParams: functionParams,
        additionalMessage: 'Customer does not exist.',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'Customer does not exist.',
        },
      };
    }

    if (customer?.customerName !== customerData?.customerName?.trim()) {
      const existingCustomer = await CustomerContact.findOne({
        customerName: {$regex: escapedRegex(customerData?.customerName)},
        fleet: fleet._id,
      });

      if (existingCustomer) {
        await createApiLog({
          type: ApiLogTypes.QUERY_END,
          level: ApiLogLevels.INFO,
          functionName: 'addCustomerInFleet',
          functionParams: functionParams,
          additionalMessage: 'Customer Already Exists With This Name.',
          startLogId,
        });

        return {
          response: {
            status: 409,
            message: 'Customer Already Exists With This Name.',
          },
        };
      }
    }

    const customerContact = await CustomerContact.findOneAndUpdate(
      {_id: customerId},
      {
        $set: {
          customerName,
          customerPhone: customerData?.customerPhone,
          customerEmail,
          customerAddress,
          customerId: customerData?.customerId,
          customerStreet: customerData.customerStreet,
          customerCity: customerData?.customerCity,
          customerCounty: customerData?.customerCounty,
          customerEircode: customerData?.customerEircode,
          customerCountry: customerData?.customerCountry,
        },
      }
    );

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'editCustomerInFleet',
      functionParams: functionParams,
      additionalMessage: 'Customer Contact Updated Successfully.',
      startLogId,
    });

    return {
      customerContact: customerContact,
      response: {
        status: 200,
        message: 'Customer Contact Updated Successfully.',
      },
    };
  } catch (err) {
    console.log('Error in Edit Customer', err);
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'editCustomerInFleet',
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
      functionName: 'editCustomerInFleet',
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
