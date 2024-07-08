import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import sgMail from '@sendgrid/mail';
import {convert} from 'html-to-text';
import {marked} from 'marked';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';
import Docket from '../../../../MongoModels/Docket';
import CustomerContact from '../../../../MongoModels/CustomerContact';
import WasteFacilityRepSignature from '../../../../MongoModels/WasteFacilityRepSignature';
import DriverSignature from '../../../../MongoModels/DriverSignature';
import CustomerSignature from '../../../../MongoModels/CustomerSignature';
import Pdf from '../../../../MongoModels/Pdf';
import {GeneratePdfBase64} from '../../../../utils/docketPdf/DocketPDFTemplate';
import DestinationFacility from '../../../../MongoModels/DestinationFacility';
import escapedRegex from '../../../../utils/escapedRegex';

export default async function addDocket(_: any, {docketData, fleetId}, context: any) {
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
      paramName: 'docketData',
      paramValue: docketData,
      paramType: typeof docketData,
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
        functionName: 'addDocket',
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
      functionName: 'addDocket',
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
      functionName: 'addDocket',
      functionParams: functionParams,
    });

    if (!docketData.customerName) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addDocket',
        functionParams: functionParams,
        additionalMessage: 'Customer Name is required',
        startLogId,
      });

      return {
        response: {
          message: 'Customer Name is required',
          status: 400,
        },
      };
    }

    const userId = new mongoose.Types.ObjectId(decodedToken.UserId);
    const user = await User.findById(userId);
    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addDocket',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        message: 'User does not exist',
        status: 404,
      };
    }
    const {email} = user.personalDetails;

    const fleet = await Fleet.findOne({
      _id: fleetId,
      $or: [{ownerEmail: email}, {membersEmails: {$elemMatch: {$eq: email}}}],
    });
    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'addDocket',
        functionParams: functionParams,
        additionalMessage: 'Either Fleet Does Not Exist OR User Does Not Belong To Fleet',
        startLogId,
      });

      return {
        response: {
          status: 404,
          message: 'Either Fleet Does Not Exist OR User Does Not Belong To Fleet',
        },
      };
    }
    console.log('DocketData:', docketData);
    let customerContact;
    if (docketData.customerName) {
      customerContact = await CustomerContact.findOne({
        customerName: {$regex: escapedRegex(docketData?.customerName)},
        fleet: fleet._id,
      });
      if (!customerContact) {
        customerContact = await CustomerContact.create({
          fleet: fleet._id,
          contactProvider: user._id,
          contactProviderEmail: user.personalDetails.email,
          fleetOwnerEmail: fleet.ownerEmail,
          customerName: docketData.customerName,
          customerPhone: docketData.customerPhone,
          customerEmail: docketData.customerEmail,
          customerId: docketData.customerId,
          customerAddress: docketData.customerAddress,
          customerStreet: docketData.customerStreet,
          customerCity: docketData?.customerCity,
          customerCounty: docketData?.customerCounty,
          customerEircode: docketData?.customerEircode,
          customerCountry: docketData?.customerCountry,
          isAutomatedGenerated: false,
        });
      }
    }

    let destinationFacility;
    if (docketData.destinationFacilityId) {
      destinationFacility = await DestinationFacility.aggregate([
        {
          $match: {
            'destinationFacilityData.destinationFacilityId': {
              $regex: escapedRegex(docketData?.destinationFacilityId),
            },
            fleet: fleet._id,
          },
        },
      ]);
      if (destinationFacility && destinationFacility?.length > 0) {
        destinationFacility = destinationFacility[0];
      }
      if (!destinationFacility || destinationFacility?.length === 0) {
        destinationFacility = await DestinationFacility.create({
          fleet: fleet._id,
          user: user._id,
          destinationFacilityData: {
            destinationFacilityName: docketData.destinationFacilityName,
            destinationFacilityAuthorisationNumber:
              docketData.destinationFacilityAuthorisationNumber,
            destinationFacilityAddress: docketData.destinationFacilityAddress,
            destinationFacilityStreet: docketData.destinationFacilityStreet,
            destinationFacilityCity: docketData?.destinationFacilityCity,
            destinationFacilityCounty: docketData?.destinationFacilityCounty,
            destinationFacilityEircode: docketData?.destinationFacilityEircode,
            destinationFacilityCountry: docketData?.destinationFacilityCountry,
            destinationFacilityLatitude: docketData?.destinationFacilityLatitude,
            destinationFacilityLongitude: docketData?.destinationFacilityLongitude,
            destinationFacilityId: docketData.destinationFacilityId,
          },
        });
      }
    }

    const individualDocketNumber = `${fleet.prefix}${+fleet.docketNumber + 1}`;
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
    await Docket.create({
      fleet: fleet._id,
      user: user._id,
      customerContact: customerContact,
      destinationFacility: destinationFacility,
      creatorEmail: user.personalDetails.email,
      fleetOwnerEmail: fleet.ownerEmail,
      docketData: {
        ...docketData,
        wasteFacilityRepSignature: docketData?.isWasteFacilityRepSignatureId
          ? wasteFacilityRepSignatureDocument?.signatureUrl
          : docketData?.wasteFacilityRepSignature,
        driverSignature: docketData?.isDriverSignatureId
          ? driverSignatureDocument?.signatureUrl
          : docketData?.driverSignature,
        customerSignature: docketData?.isCustomerSignatureId
          ? customerSignatureDocument?.signatureUrl
          : docketData?.customerSignature,
        docketNumber: +fleet.docketNumber + 1,
        prefix: fleet.prefix,
        individualDocketNumber,
      },
    });
    await Fleet.findByIdAndUpdate(fleet._id, {
      docketNumber: +fleet.docketNumber + 1,
      individualDocketNumber,
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
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'addDocket',
      functionParams: functionParams,
      additionalMessage: 'Docket has been added successfully.',
      startLogId,
    });
    if (docketData?.doSendEmail === 'yes') {
      if (docketData?.isMobileApp) {
        async function markdownToText(markdownText: unknown) {
          if (markdownText) {
            const htmlContent = await marked(markdownText?.toString() || '');
            return convert(htmlContent, {
              wordwrap: false,
            });
          }
          return '';
        }
        const termsConditions = await markdownToText(fleet?.termsAndConditions);
        await GeneratePdfBase64(
          {
            individualDocketNumber: individualDocketNumber,
            VAT: fleet?.VAT,
            termsAndConditions: termsConditions,
            permitNumber: fleet?.permitNumber,
            permitHolderLogo: fleet?.permitHolderLogo,
            permitHolderEmail: fleet?.permitHolderEmail,
            permitHolderContactDetails: fleet?.permitHolderContactDetails,
            permitHolderAddress: fleet?.permitHolderAddress,
            permitHolderName: fleet?.permitHolderName,
            driverName: user.personalDetails.name,
            ...docketData,
            wasteFacilityRepSignature: docketData?.isWasteFacilityRepSignatureId
              ? wasteFacilityRepSignatureDocument?.signatureUrl
              : docketData?.wasteFacilityRepSignature,
            driverSignature: docketData?.isDriverSignatureId
              ? driverSignatureDocument?.signatureUrl
              : docketData?.driverSignature,
            customerSignature: docketData?.isCustomerSignatureId
              ? customerSignatureDocument?.signatureUrl
              : docketData?.customerSignature,
          },
          `${individualDocketNumber} # | ${fleet?.name}`,
          `docket-${individualDocketNumber}.pdf`,
          'sendEmail'
        );
      } else {
        const pdf: any = await Pdf.findOne({_id: docketData?.pdfBase64Url});
        const apiKey = ENV_VALUES.SEND_GRID_API_KEY ? ENV_VALUES.SEND_GRID_API_KEY : '';
        sgMail.setApiKey(apiKey);
        const payload = {
          to: docketData?.customerEmail ? docketData?.customerEmail : customerContact.customerEmail,
          from: 'hello@wastedocket.ie',
          subject: `${individualDocketNumber} # | ${fleet?.name}`,
          html: `<strong>${
            docketData?.collectionPointAddress
              ? `Collection Point Address: ${docketData?.collectionPointAddress}`
              : 'Please find the docket for the pickup'
          }</strong>`,
          attachments: [
            {
              content: pdf?.pdfUrl.split(',')[1],
              filename: `docket-${individualDocketNumber}.pdf`,
              type: 'application/pdf',
              disposition: 'attachment',
            },
          ],
        };
        await sgMail.send(payload);
      }
      await createApiLog({
        type: ApiLogTypes.API_PROCESSING_END,
        level: ApiLogLevels.INFO,
        functionName: 'sendEmail',
        functionParams: [
          {paramName: 'templateData', paramValue: 'Attachment', paramType: typeof 'Attachment'},
          {
            paramName: 'sendToEmail',
            paramValue: docketData?.customerEmail
              ? docketData?.customerEmail
              : customerContact.customerEmail,
            paramType: typeof docketData?.customerEmail
              ? docketData?.customerEmail
              : customerContact.customerEmail,
          },
          {paramName: 'templateId', paramValue: 'Attachment', paramType: typeof 'Attachment'},
        ],
        additionalMessage: 'sendEmail Resolved Successfully',
        startLogId,
      });
    }
    return {
      response: {
        status: 200,
        message: 'Docket has been added successfully.',
      },
    };

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'addDocket',
      functionParams: functionParams,
      additionalMessage: 'Query Unsuccessful',
      startLogId,
    });

    return {
      response: {
        status: 500,
        message: 'Query Unsuccessful',
      },
    };
  } catch (err) {
    console.log('Error while add docket', err);

    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'addDocket',
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
      functionName: 'addDocket',
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
