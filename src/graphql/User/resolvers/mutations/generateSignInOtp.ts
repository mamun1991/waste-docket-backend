import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import sendEmail from '../../../../utils/sendEmailHandler';
import TEMPLATES from '../../../../constants/emailTemplateIDs';
import PendingOtp from '../../../../MongoModels/PendingOTP';
import User from '../../../../MongoModels/User';
import generateOTP from '../../../../utils/generateOTP';
import Subscription from '../../../../MongoModels/Subscription';

export default async function generateSignInOtp(parent: any, {email}: {email: string}) {
  let startLogId: String;

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.MUTATION_START,
      level: ApiLogLevels.INFO,
      functionName: 'generateSignInOtp',
      functionParams: [{paramName: 'value', paramValue: email, paramType: typeof email}],
    });

    const userExists = await User.exists({
      'personalDetails.email': email,
    });

    const user = await User.findOne({
      'personalDetails.email': email,
    });
    if (user) {
      const sub = await Subscription.findOne({user: user._id});
      if (!sub) {
        let currentDate = new Date();
        currentDate.setMonth(currentDate.getMonth() + 2); // Add trailing months
        const trialEndsAt = currentDate;
        await Subscription.create({
          user: user?._id,
          plan: 'FREE',
          status: 'trialing',
          trialEndsAt,
        });
      }
    }

    if (!userExists) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'generateSignInOtp',
        functionParams: [{paramName: 'value', paramValue: email, paramType: typeof email}],
        additionalMessage: 'Account Not Found. Please sign up to create a new account.',
        startLogId,
      });

      return {
        message: 'Account Not Found. Please sign up to create a new account.',
        status: 404,
      };
    }

    const generatedToken = generateOTP();

    // TODO: Uncomment when in production
    await PendingOtp.deleteMany({email: email});
    await PendingOtp.create({
      email: email ? email.trim() : '',
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
      level: ApiLogLevels.INFO,
      functionName: 'generateSignInOtp',
      functionParams: [{paramName: 'value', paramValue: email, paramType: typeof email}],
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
      functionName: 'generateSignInOtp',
      functionParams: [{paramName: 'value', paramValue: email, paramType: typeof email}],
      additionalMessage: err.message,
      startLogId,
    });
    console.log('(generateSignInOtp) ==> Error while generating signin OTP ==> ', err);

    return {
      message: err?.message,
      status: 500,
    };
  }
}
