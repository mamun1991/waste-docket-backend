import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import User from '../../../../MongoModels/User';
import CustomerContact from '../../../../MongoModels/CustomerContact';
import Papa from 'papaparse';
import escapedRegex from '../../../../utils/escapedRegex';

function isUserInFleet(fleet, user) {
  const userEmail = user.personalDetails.email;
  const {ownerEmail} = fleet;
  const memberEmails = fleet.membersEmails;

  return ownerEmail === userEmail || memberEmails.includes(userEmail);
}

export default async function importCustomersInFleet(_: any, {fleetId, file}, context: any) {
  console.log('{fleetId, file}', {fleetId, file});
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
      paramName: 'file',
      paramValue: file,
      paramType: typeof file,
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
        functionName: 'importCustomersInFleet',
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
      functionName: 'importCustomersInFleet',
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
      functionName: 'importCustomersInFleet',
      functionParams: functionParams,
    });

    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'importCustomersInFleet',
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
        functionName: 'importCustomersInFleet',
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

    const fileWaited = await file;
    const {createReadStream} = await fileWaited.file;

    const parseResult: any = await new Promise((resolve, reject) => {
      let fileContent = '';
      createReadStream()
        .on('data', chunk => {
          fileContent += chunk.toString();
        })
        .on('end', () => {
          fileContent = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          const lines = fileContent.split('\n');
          const headers = lines[0].split(',');
          const headerCounts: any = {};
          let processedHeaders: any = [];
          const generateUniqueHeader = (header: string) => {
            const count = headerCounts[header] || 0;
            headerCounts[header] = count + 1;
            if (count === 0) {
              return header;
            } else {
              return `${header}_${count}`;
            }
          };
          headers.forEach(header => {
            const columnName = header.trim().replace(/^"(.*)"$/, '$1');
            const uniqueHeader = generateUniqueHeader(columnName);
            processedHeaders.push(uniqueHeader);
          });
          const processedHeaderLine = processedHeaders.join(',');
          const fileContentWithoutHeaders = lines.slice(1).join('\n');
          const finalContent = processedHeaderLine + '\n' + fileContentWithoutHeaders;
          Papa.parse(finalContent, {
            header: true,
            skipEmptyLines: 'greedy',
            complete: result => {
              resolve(result);
            },
            error: error => {
              reject(error);
            },
          });
        })
        .on('error', error => {
          reject(error);
        });
    });

    console.log(parseResult, 'parseResult of customers');
    console.log(parseResult?.data?.length, 'parseResult length of customers');
    let customersData = parseResult?.data;
    let importedCount = 0;
    let skippedCount = 0;

    let addedCustomerContacts;
    try {
      addedCustomerContacts = customersData.map(async customer => {
        if (customer.customerName) {
          console.log(customer, 'Customer');

          const existingCustomer = await CustomerContact.findOne({
            customerName: {$regex: escapedRegex(customer?.customerName)},
            fleet: fleet._id,
          });

          if (!existingCustomer) {
            await CustomerContact.create({
              fleet: fleet._id,
              contactProvider: user._id,
              contactProviderEmail: user.personalDetails.email,
              fleetOwnerEmail: fleet.ownerEmail,
              customerName: customer.customerName,
              customerPhone: customer.customerPhone,
              customerEmail: customer.customerEmail,
              customerId: customer.customerId,
              customerAddress: customer.customerAddress,
              customerStreet: customer.customerStreet,
              customerCity: customer.customerCity,
              customerCounty: customer.customerCounty,
              customerEircode: customer.customerEircode,
              customerCountry: customer.customerCountry,
              isAutomatedGenerated: true,
            });
            importedCount++;
          } else {
            console.log(`Customer with Name ${customer?.customerName} already exists in fleet.`);
            skippedCount++;
          }
        } else {
          console.log(
            `Skipping customer due to missing name in the customer record: ${JSON.stringify(
              customer
            )}`
          );
          skippedCount++;
        }
      });
    } catch (e) {
      console.log('Error in import customers:', e);
    }

    await Promise.all(addedCustomerContacts);

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'importCustomersInFleet',
      functionParams: functionParams,
      additionalMessage: 'Customer Contacts Imported Successfully.',
      startLogId,
    });

    let message = '';
    if (importedCount === 0) {
      message = 'No customer imported due to missing or duplicate name in the customer record.';
    } else {
      message = `Imported ${importedCount} ${
        importedCount > 1 ? 'customers' : 'customer'
      } successfully.`;
      if (skippedCount > 0) {
        message += ` Skipped ${skippedCount} ${
          skippedCount > 1
            ? 'customers due to missing or duplicate name in the customer record.'
            : 'customer due to missing or duplicate name in the customer record.'
        }.`;
      }
    }
    console.log(message);

    return {
      response: {
        status: 200,
        message: message,
      },
    };
  } catch (err) {
    console.log('Error in import customers', err);
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'importCustomersInFleet',
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
      functionName: 'importCustomersInFleet',
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
