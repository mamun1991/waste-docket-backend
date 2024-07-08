import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import {convert} from 'html-to-text';
import {marked} from 'marked';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';
import Docket from '../../../../MongoModels/Docket';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import isUserOwnerOfFleet from '../../../../utils/isUserOwnerOfFleet';
import CustomerContact from '../../../../MongoModels/CustomerContact';
import WasteFacilityRepSignature from '../../../../MongoModels/WasteFacilityRepSignature';
import DriverSignature from '../../../../MongoModels/DriverSignature';
import CustomerSignature from '../../../../MongoModels/CustomerSignature';
import Pdf from '../../../../MongoModels/Pdf';
import {GeneratePdfBase64} from '../../../../utils/docketPdf/DocketPDFTemplate';
import DestinationFacility from '../../../../MongoModels/DestinationFacility';
import escapedRegex from '../../../../utils/escapedRegex';

export default async function updateDocketById(
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
        functionName: 'updateDocketById',
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
      functionName: 'updateDocketById',
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
      functionName: 'updateDocketById',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateDocketById',
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
        functionName: 'updateDocketById',
        functionParams: functionParams,
        additionalMessage: 'Fleets not found',
        startLogId,
      });
      return {
        message: 'Fleets not found',
        status: 404,
      };
    }

    const isOwner = isUserOwnerOfFleet(fleet, user);
    if (!isOwner) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateDocketById',
        functionParams: functionParams,
        additionalMessage: 'User is not the owner of this fleet',
        startLogId,
      });
      return {
        message: 'User is not the owner of this fleet',
        status: 404,
      };
    }

    let customerContact;
    if (docketData.customerName) {
      const updateFields: any = {
        customerName: docketData.customerName,
        customerPhone: docketData.customerPhone,
        customerEmail: docketData.customerEmail,
        customerId: docketData.customerId,
        customerAddress: docketData.customerAddress,
      };
      if (docketData.customerStreet) updateFields.customerStreet = docketData.customerStreet;
      if (docketData.customerCity) updateFields.customerCity = docketData.customerCity;
      if (docketData.customerCounty) updateFields.customerCounty = docketData.customerCounty;
      if (docketData.customerEircode) updateFields.customerEircode = docketData.customerEircode;
      if (docketData.customerCountry) updateFields.customerCountry = docketData.customerCountry;
      customerContact = await CustomerContact.findOneAndUpdate(
        {
          customerName: {$regex: escapedRegex(docketData?.customerName)},
          fleet: fleet?._id,
        },
        updateFields,
        {new: true, upsert: true}
      );
      if (!customerContact) {
        customerContact = await CustomerContact.create({
          fleet: fleet?._id,
          contactProvider: user._id,
          contactProviderEmail: user.personalDetails.email,
          fleetOwnerEmail: fleet.ownerEmail,
          customerName: docketData.customerName,
          customerPhone: docketData.customerPhone,
          customerEmail: docketData.customerEmail,
          customerId: docketData.customerId,
          customerAddress: docketData.customerAddress,
          customerStreet: docketData.customerStreet,
          customerCity: docketData?.cusomterCity,
          customerCounty: docketData?.customerCounty,
          customerEircode: docketData?.customerEircode,
          customerCountry: docketData?.customerCountry,
          isAutomatedGenerated: false,
        });
      }
    }

    let destinationFacility;
    if (docketData?.destinationFacilityId) {
      const updateFields = {
        'destinationFacilityData.destinationFacilityName': docketData.destinationFacilityName,
        'destinationFacilityData.destinationFacilityAuthorisationNumber':
          docketData.destinationFacilityAuthorisationNumber,
        'destinationFacilityData.destinationFacilityId': docketData.destinationFacilityId,
        'destinationFacilityData.destinationFacilityAddress': docketData.destinationFacilityAddress,
        'destinationFacilityData.destinationFacilityStreet': docketData.destinationFacilityStreet,
        'destinationFacilityData.destinationFacilityCity': docketData.destinationFacilityCity,
        'destinationFacilityData.destinationFacilityCounty': docketData.destinationFacilityCounty,
        'destinationFacilityData.destinationFacilityEircode': docketData.destinationFacilityEircode,
        'destinationFacilityData.destinationFacilityCountry': docketData.destinationFacilityCountry,
        'destinationFacilityData.destinationFacilityLatitude':
          docketData.destinationFacilityLatitude,
        'destinationFacilityData.destinationFacilityLongitude':
          docketData.destinationFacilityLongitude,
      };
      destinationFacility = await DestinationFacility.findOneAndUpdate(
        {
          'destinationFacilityData.destinationFacilityId': escapedRegex(
            docketData?.destinationFacilityId
          ),
          fleet: fleet._id,
        },
        {$set: updateFields},
        {new: true, upsert: true}
      );

      if (!destinationFacility) {
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
        docketData: {
          ...existingDocket.docketData,
          ...docketData,
          wasteFacilityRepSignature:
            docketData?.wasteFacilityRepSignature === 'clear'
              ? ''
              : docketData?.isWasteFacilityRepSignatureId
              ? wasteFacilityRepSignatureDocument?.signatureUrl
              : docketData?.wasteFacilityRepSignature
              ? docketData?.wasteFacilityRepSignature
              : existingDocket?.docketData?.wasteFacilityRepSignature,
          driverSignature:
            docketData?.driverSignature === 'clear'
              ? ''
              : docketData?.isDriverSignatureId
              ? driverSignatureDocument?.signatureUrl
              : docketData?.driverSignature
              ? docketData?.driverSignature
              : existingDocket?.docketData?.driverSignature,
          customerSignature:
            docketData?.customerSignature === 'clear'
              ? ''
              : docketData?.isCustomerSignatureId
              ? customerSignatureDocument?.signatureUrl
              : docketData?.customerSignature
              ? docketData?.customerSignature
              : existingDocket?.docketData?.customerSignature,
        },
        customerContact: customerContact,
        destinationFacility: destinationFacility,
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
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'updateDocketById',
      functionParams: functionParams,
      additionalMessage: 'Docket has been updated successfully.',
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
            individualDocketNumber: existingDocket?.docketData?.individualDocketNumber,
            VAT: fleet?.VAT,
            termsAndConditions: termsConditions,
            permitNumber: fleet?.permitNumber,
            permitHolderLogo: fleet?.permitHolderLogo,
            permitHolderEmail: fleet?.permitHolderEmail,
            permitHolderContactDetails: fleet?.permitHolderContactDetails,
            permitHolderAddress: fleet?.permitHolderAddress,
            permitHolderName: fleet?.permitHolderName,
            driverName:
              user?.personalDetails?.email === existingDocket?.creatorEmail
                ? user?.personalDetails?.name
                : existingDocket?.user?.personalDetails?.name,
            ...existingDocket.docketData,
            ...docketData,
            wasteFacilityRepSignature:
              docketData?.wasteFacilityRepSignature === 'clear'
                ? ''
                : docketData?.isWasteFacilityRepSignatureId
                ? wasteFacilityRepSignatureDocument?.signatureUrl
                : docketData?.wasteFacilityRepSignature
                ? docketData?.wasteFacilityRepSignature
                : existingDocket?.docketData?.wasteFacilityRepSignature,
            driverSignature:
              docketData?.driverSignature === 'clear'
                ? ''
                : docketData?.isDriverSignatureId
                ? driverSignatureDocument?.signatureUrl
                : docketData?.driverSignature
                ? docketData?.driverSignature
                : existingDocket?.docketData?.driverSignature,
            customerSignature:
              docketData?.customerSignature === 'clear'
                ? ''
                : docketData?.isCustomerSignatureId
                ? customerSignatureDocument?.signatureUrl
                : docketData?.customerSignature
                ? docketData?.customerSignature
                : existingDocket?.docketData?.customerSignature,
          },
          `${existingDocket?.docketData?.individualDocketNumber} # | ${existingDocket?.fleet?.name}`,
          `docket-${existingDocket?.docketData?.individualDocketNumber}.pdf`,
          'sendEmail'
        );
      } else {
        const pdf: any = await Pdf.findOne({_id: docketData?.pdfBase64Url});
        const apiKey = ENV_VALUES.SEND_GRID_API_KEY ? ENV_VALUES.SEND_GRID_API_KEY : '';
        sgMail.setApiKey(apiKey);
        const payload = {
          to: docketData?.customerEmail,
          from: 'hello@wastedocket.ie',
          subject: `${existingDocket?.docketData?.individualDocketNumber} # | ${existingDocket?.fleet?.name}`,
          html: `<strong>${
            docketData?.collectionPointAddress
              ? `Collection Point Address: ${docketData?.collectionPointAddress}`
              : 'Please find the docket for the pickup'
          }</strong>`,
          attachments: [
            {
              content: pdf?.pdfUrl.split(',')[1],
              filename: `docket-${existingDocket?.docketData?.individualDocketNumber}.pdf`,
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
            paramValue: docketData?.customerEmail,
            paramType: typeof docketData?.customerEmail,
          },
          {paramName: 'templateId', paramValue: 'Attachment', paramType: typeof 'Attachment'},
        ],
        additionalMessage: 'sendEmail Resolved Successfully',
        startLogId,
      });
    }
    return {
      message: 'Docket has been updated successfully.',
      status: 200,
    };
  } catch (err) {
    console.log('Error While Update Docket', err);
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'updateDocketById',
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
      functionName: 'updateDocketById',
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
