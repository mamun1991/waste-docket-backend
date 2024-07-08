import jwt from 'jsonwebtoken';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import PendingOtp from '../../../../MongoModels/PendingOTP';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import User from '../../../../MongoModels/User';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';

export default async function validateOtp(
  _: any,
  {
    fullName,
    email,
    otpToken,
    accountSubType,
  }: {fullName: string; email: string; otpToken: string; accountSubType: string}
) {
  let startLogId: String;
  const ENV_VALUES = await AwsSecrets.getInstance();

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.MUTATION_START,
      level: ApiLogLevels.INFO,
      functionName: 'validateOtp',
      functionParams: [
        {paramName: 'email', paramValue: email, paramType: typeof email},
        {paramName: 'otpToken', paramValue: otpToken, paramType: typeof otpToken},
      ],
    });

    const trimmedOTP = otpToken.trim();
    const validOtp = await PendingOtp.findOne({
      email: email,
      otpToken: trimmedOTP,
    });

    if (!validOtp) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'validateOtp',
        functionParams: [
          {paramName: 'email', paramValue: email, paramType: typeof email},
          {paramName: 'otpToken', paramValue: otpToken, paramType: typeof otpToken},
        ],
        additionalMessage: 'Invalid Permissions: Invalid OTP Token',
        startLogId,
      });

      return {
        response: {
          message: 'Invalid OTP Token',
          status: 400,
        },
      };
    }

    await PendingOtp.deleteOne({
      email: email,
      otpToken,
    });
    let FleetInvitationDoc;
    let userData;
    const user = await User.findOne({'personalDetails.email': email}).populate('fleets');
    if (user) {
      if (user.invitations.length > 0) {
        FleetInvitationDoc = await FleetInvitation.find({
          inviteeEmail: user.personalDetails.email,
        }).populate('fleetId');
      }

      userData = {
        _id: user._id,
        accountType: user.accountType,
        isSignUpComplete: user.isSignUpComplete,
        personalDetails: user.personalDetails,
        fleets: user.fleets,
        invitations: FleetInvitationDoc,
      };
      if (fullName && fullName !== '' && fullName?.trim() !== '') {
        const name =
          fullName && fullName !== '' && fullName?.trim() !== ''
            ? fullName
            : user?.personalDetails?.name;
        await User.findByIdAndUpdate(user?._id, {
          'personalDetails.name': name,
        });
      }
    }

    let newUser;
    if (!user) {
      FleetInvitationDoc = await FleetInvitation.find({inviteeEmail: email}).populate('fleetId');
      let invitations = [];

      if (FleetInvitationDoc) {
        invitations = FleetInvitationDoc.map(invitation => invitation.fleetId);
      }

      newUser = await User.create({
        'personalDetails.email': email,
        'personalDetails.name': fullName,
        invitations: invitations,
        accountSubType: accountSubType,
      });
      newUser = {...newUser._doc, invitations: FleetInvitationDoc};
    }

    const accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    const token = jwt.sign({UserId: user ? user._id : newUser._id}, accessTokenSecret, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'validateOtp',
      functionParams: [
        {paramName: 'email', paramValue: email, paramType: typeof email},
        {paramName: 'otpToken', paramValue: otpToken, paramType: typeof otpToken},
      ],
      additionalMessage: 'Valid OTP',
      startLogId,
    });

    return {
      email,
      token,
      user: user ? userData : newUser,
      response: {
        message: 'Valid OTP',
        status: 200,
      },
    };
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'validateOtp',
      functionParams: [
        {paramName: 'email', paramValue: email, paramType: typeof email},
        {paramName: 'otpToken', paramValue: otpToken, paramType: typeof otpToken},
      ],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      response: {
        message: 'Unknown Error',
        status: 500,
      },
    };
  }
}
