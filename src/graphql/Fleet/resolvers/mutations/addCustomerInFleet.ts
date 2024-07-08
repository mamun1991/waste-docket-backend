import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import User from '../../../../MongoModels/User';
import CustomerContact from '../../../../MongoModels/CustomerContact';
import escapeStringRegexp from 'escape-string-regexp';
import escapedRegex from '../../../../utils/escapedRegex';

function isUserInFleet(fleet, user) {
  const userEmail = user.personalDetails.email;
  const {ownerEmail} = fleet;
  const memberEmails = fleet.membersEmails;

  return ownerEmail === userEmail || memberEmails.includes(userEmail);
}

export default async function addCustomerInFleet(_: any, {fleetId, customerData}, context: any) {
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
        functionName: 'addCustomerInFleet',
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
      functionName: 'addCustomerInFleet',
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
      functionName: 'addCustomerInFleet',
      functionParams: functionParams,
    });

    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'addCustomerInFleet',
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

    const isInFleet = isUserInFleet(fleet, user);

    if (!isInFleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'addCustomerInFleet',
        functionParams: functionParams,
        additionalMessage: 'User is not in fleet',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'User is not in fleet',
        },
      };
    }

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

    const customerContact = await CustomerContact.create({
      fleet: fleet._id,
      contactProvider: user._id,
      contactProviderEmail: user.personalDetails.email,
      fleetOwnerEmail: fleet.ownerEmail,
      customerName: customerData.customerName,
      customerPhone: customerData.customerPhone,
      customerEmail: customerData.customerEmail,
      customerAddress: customerData.customerAddress,
      customerStreet: customerData.customerStreet,
      customerCity: customerData?.customerCity,
      customerCounty: customerData?.customerCounty,
      customerEircode: customerData?.customerEircode,
      customerCountry: customerData?.customerCountry,
      customerId: customerData.customerId,
      isAutomatedGenerated: false,
    });
    console.log(customerContact);
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'addCustomerInFleet',
      functionParams: functionParams,
      additionalMessage: 'Customer Contact Created Successfully.',
      startLogId,
    });

    return {
      customerContact: customerContact,
      response: {
        status: 200,
        message: 'Customer Contact Created Successfully.',
      },
    };
  } catch (err) {
    console.log('Error in add customer', err);
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addCustomerInFleet',
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
      functionName: 'addCustomerInFleet',
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
