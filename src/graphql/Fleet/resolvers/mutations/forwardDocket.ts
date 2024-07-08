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
import {GeneratePdfBase64} from '../../../../utils/docketPdf/DocketPDFTemplate';

export default async function forwardDocket(_: any, {fleetId, docketId, email}, context: any) {
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
        functionName: 'forwardDocket',
        functionParams: [
          {
            paramName: 'docketId',
            paramValue: docketId,
            paramType: typeof docketId,
          },
          {
            paramName: 'email',
            paramValue: email,
            paramType: typeof email,
          },
          {
            paramName: 'fleetId',
            paramValue: fleetId,
            paramType: typeof fleetId,
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
      functionName: 'forwardDocket',
      functionParams: [
        {
          paramName: 'docketId',
          paramValue: docketId,
          paramType: typeof docketId,
        },
        {
          paramName: 'email',
          paramValue: email,
          paramType: typeof email,
        },
        {
          paramName: 'fleetId',
          paramValue: fleetId,
          paramType: typeof fleetId,
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
      paramName: 'email',
      paramValue: email,
      paramType: typeof email,
    },
    {
      paramName: 'fleetId',
      paramValue: fleetId,
      paramType: typeof fleetId,
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
      functionName: 'forwardDocket',
      functionParams: functionParams,
    });

    if (!(fleetId && email && docketId)) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'forwardDocket',
        functionParams: functionParams,
        additionalMessage: 'Fleet ID, Docket ID and Email are required.',
        startLogId,
      });

      return {
        status: 400,
        message: 'Fleet ID, Docket ID and Email are required.',
      };
    }

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'forwardDocket',
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
        functionName: 'forwardDocket',
        functionParams: functionParams,
        additionalMessage: 'Fleet not found',
        startLogId,
      });
      return {
        message: 'Fleet not found',
        status: 404,
      };
    }

    const existingDocket: any = await Docket.findById(docketId)
      .lean()
      .populate('fleet', 'name id')
      .populate('user', 'name')
      .populate('customerContact')
      .populate('destinationFacility');
    console.log(existingDocket);

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
    const pdfResponse = await GeneratePdfBase64(
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
        ...existingDocket?.customerContact,
        ...existingDocket?.destinationFacility?.destinationFacilityData,
        wasteFacilityRepSignature: existingDocket?.docketData?.wasteFacilityRepSignature,
        driverSignature: existingDocket?.docketData?.driverSignature,
        customerSignature: existingDocket?.docketData?.customerSignature,
      },
      `${existingDocket?.docketData?.individualDocketNumber} # | ${existingDocket?.fleet?.name}`,
      `docket-${existingDocket?.docketData?.individualDocketNumber}.pdf`,
      'pdfUrl'
    );
    const ENV_VALUES = await AwsSecrets.getInstance();
    const apiKey = ENV_VALUES.SEND_GRID_API_KEY ? ENV_VALUES.SEND_GRID_API_KEY : '';
    sgMail.setApiKey(apiKey);
    const msg = {
      to: email,
      from: 'hello@wastedocket.ie',
      subject: `${existingDocket?.fleet?.name}, Docket: ${existingDocket?.docketData?.individualDocketNumber}`,
      html: `<p>Hi,</p>
          <p>${user?.personalDetails?.name} from ${existingDocket?.fleet?.name} has forwarded this docket ${existingDocket?.docketData?.individualDocketNumber} to you.</p>
          <p>Regards,</p>
          <p>${user?.personalDetails?.name}</p>`,
      attachments: [
        {
          content: pdfResponse.toString('base64'),
          filename: `docket-${existingDocket?.docketData?.individualDocketNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };

    await sgMail.send(msg);

    await createApiLog({
      type: ApiLogTypes.API_PROCESSING_END,
      level: ApiLogLevels.INFO,
      functionName: 'sendEmail',
      functionParams: [
        {paramName: 'templateData', paramValue: 'Attachment', paramType: typeof 'Attachment'},
        {
          paramName: 'sendToEmail',
          paramValue: email,
          paramType: typeof email,
        },
        {paramName: 'templateId', paramValue: 'Attachment', paramType: typeof 'Attachment'},
      ],
      additionalMessage: 'sendEmail Resolved Successfully',
      startLogId,
    });

    return {
      message: 'Docket has been forwarded.',
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'forwardDocket',
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
      functionName: 'forwardDocket',
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
