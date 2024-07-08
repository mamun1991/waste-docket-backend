import escapeStringRegexp from 'escape-string-regexp';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import sendEmail from '../../../../utils/sendEmailHandler';
import TEMPLATES from '../../../../constants/emailTemplateIDs';
import PendingOtp from '../../../../MongoModels/PendingOTP';
import User from '../../../../MongoModels/User';

export default async function generateSignUpOtp(_, {email, fullName}) {
  let startLogId: String;
  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.MUTATION_START,
      level: ApiLogLevels.INFO,
      functionName: 'generateSignUpOtp',
      functionParams: [
        {paramName: 'email', paramValue: email, paramType: typeof email},
        {paramName: 'fullName', paramValue: fullName, paramType: typeof fullName},
      ],
    });

    const safeEmail = escapeStringRegexp(email.trim());
    const pattern = `^${safeEmail}$`;
    const regex = new RegExp(pattern, 'i');

    const userExists = await User.exists({'accountDetails.email': {$regex: regex}});

    if (userExists) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.INFO,
        functionName: 'generateSignUpOtp',
        functionParams: [
          {paramName: 'email', paramValue: email, paramType: typeof email},
          {paramName: 'fullName', paramValue: fullName, paramType: typeof fullName},
        ],
        additionalMessage: 'Email Already in Use - Generating Sign-In OTP',
        startLogId,
      });
    }

    const generatedToken = Math.floor(100000 + Math.random() * 900000);

    const trimmedEmail = email.trim();

    await PendingOtp.create({
      email: trimmedEmail,
      fullName,
      otpToken: generatedToken,
    });

    await sendEmail(
      {
        otpToken: generatedToken,
      },
      email,
      TEMPLATES.SIGN_IN.OTP_VERIFICATION,
      'wastedocket@secomind.ai'
    );

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'generateSignUpOtp',
      functionParams: [
        {paramName: 'email', paramValue: email, paramType: typeof email},
        {paramName: 'fullName', paramValue: fullName, paramType: typeof fullName},
      ],
      additionalMessage: `OTP Generated and Sent Successfully: OTP ${generatedToken}`,
      startLogId,
    });

    return {
      message: 'OTP Generated and Sent Successfully',
      status: 200,
    };
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'generateSignUpOtp',
      functionParams: [
        {paramName: 'email', paramValue: email, paramType: typeof email},
        {paramName: 'fullName', paramValue: fullName, paramType: typeof fullName},
      ],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      message: 'Unknown Error',
      status: 500,
    };
  }
}
