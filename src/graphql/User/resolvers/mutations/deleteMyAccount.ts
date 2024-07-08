import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import Fleet from '../../../../MongoModels/Fleet';
import User from '../../../../MongoModels/User';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Docket from '../../../../MongoModels/Docket';
import Subscription from '../../../../MongoModels/Subscription';
import DestinationFacility from '../../../../MongoModels/DestinationFacility';
import CustomerContact from '../../../../MongoModels/CustomerContact';
import WasteCollectionPermitDocument from '../../../../MongoModels/WasteCollectionPermitDocument';
import Stripe from 'stripe';
import sendEmail from '../../../../utils/sendEmailHandler';
import TEMPLATES from '../../../../constants/emailTemplateIDs';
// delete my account mutation
export default async function deleteMyAccount(_: any, __: any, context: {token: string}) {
  let startLogId: String;
  const {token} = context;

  let accessTokenSecret: string;
  let decodedToken: any;
  const ENV_VALUES = await AwsSecrets.getInstance();

  let functionParams;
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
    functionParams = [
      {
        paramName: 'userId',
        paramValue: decodedToken.UserId,
        paramType: typeof decodedToken.UserId,
      },
    ];
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'deleteMyAccount',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      message: err.message,
      status: 500,
    };
  }

  try {
    const stripe = new Stripe(
      ENV_VALUES.STRIPE_MODE === 'production'
        ? ENV_VALUES.STRIPE_SECRET_PRODUCTION_KEY
        : ENV_VALUES.STRIPE_SECRET_TEST_KEY,
      {
        apiVersion: '2023-10-16',
      }
    );

    startLogId = await createApiLog({
      type: ApiLogTypes.MUTATION_START,
      level: ApiLogLevels.INFO,
      functionName: 'deleteMyAccount',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteMyAccount',
        functionParams: functionParams,
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        message: 'User does not exist',
        status: 404,
      };
    }

    if (
      user?.personalDetails?.email === 'driver.wastedocket@gmail.com' ||
      user?.personalDetails?.email === 'business.wastedocket@gmail.com'
    ) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteMyAccount',
        functionParams: functionParams,
        additionalMessage: 'You cannot delete this account as it is used for demo purposes.',
        startLogId,
      });

      return {
        message: 'You cannot delete this account as it is used for demo purposes.',
        status: 403,
      };
    }

    user.fleets.forEach(async fleetId => {
      const fleet = await Fleet.findById(fleetId);
      if (fleet.ownerEmail === user.personalDetails.email) {
        await Fleet.findByIdAndDelete(fleetId);
        await User.updateMany({$pull: {fleets: fleetId}});
        await FleetInvitation.deleteMany({
          fleetId: fleetId,
        });
        await DestinationFacility.deleteMany({fleet: fleetId});
        await CustomerContact.deleteMany({fleet: fleetId});
        await WasteCollectionPermitDocument.deleteMany({fleet: fleetId});
        await Docket.deleteMany({fleet: fleetId});
      } else {
        const invitation = await FleetInvitation.findOneAndDelete({
          inviteeEmail: user.personalDetails.email,
          fleetId: fleetId,
          userId: user?._id,
        });
        await Fleet.updateOne(
          {_id: fleetId},
          {$pull: {membersEmails: user.personalDetails.email, invitations: invitation?._id}}
        );
      }
    });

    const currentSubscription = await Subscription.findOne({user: user?._id});
    if (currentSubscription?.stripeCustomerId)
      try {
        await stripe.customers.del(currentSubscription?.stripeCustomerId as string);
      } catch (er) {
        // error
        console.log(er.message);
      }

    await User.findByIdAndDelete(user._id);
    await Subscription.findOneAndDelete({user: user?._id});

    await sendEmail(
      {},
      user?.personalDetails?.email?.toString(),
      TEMPLATES.INVITATION.ACCOUNT_DELETED,
      'wastedocket@secomind.ai'
    );

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'deleteMyAccount',
      functionParams: functionParams,
      additionalMessage: 'User Account Deleted Successfully',
      startLogId,
    });

    return {
      message: 'User Account Deleted Successfully',
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteMyAccount',
        functionParams: [],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'deleteMyAccount',
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
