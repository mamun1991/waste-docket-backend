import mongoose from 'mongoose';
import Subscription from '../../../../MongoModels/Subscription';
import User from '../../../../MongoModels/User';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Stripe from 'stripe';
import hasDatePassed from '../../../../utils/hasDatePassed';
import sendEmail from '../../../../utils/sendEmailHandler';
import TEMPLATES from '../../../../constants/emailTemplateIDs';

export default async function cancelSubscription(_parent, {subscriptionId}) {
  let ENV_VALUES = await AwsSecrets.getInstance();
  const stripe = new Stripe(
    ENV_VALUES.STRIPE_MODE === 'production'
      ? ENV_VALUES.STRIPE_SECRET_PRODUCTION_KEY
      : ENV_VALUES.STRIPE_SECRET_TEST_KEY,
    {
      apiVersion: '2023-10-16',
    }
  );
  try {
    const currentSubscription: any = await Subscription.findOne({
      stripeSubscriptionId: subscriptionId,
    }).populate('user');
    const fleetCount = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(currentSubscription.user as string),
        },
      },
      {
        $lookup: {
          from: 'fleets',
          localField: 'personalDetails.email',
          foreignField: 'ownerEmail',
          as: 'userFleets',
        },
      },
      {
        $unwind: '$userFleets',
      },
      {
        $lookup: {
          from: 'fleetInvitation',
          localField: 'userFleets._id',
          foreignField: 'fleetId',
          as: 'userInvitations',
        },
      },
      {
        $unwind: '$userInvitations',
      },
      {
        $group: {
          _id: '$_id',
          count: {$sum: 1},
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
        },
      },
    ]);
    const invitationCount = fleetCount[0] ? fleetCount[0].count : 0;
    if (invitationCount >= 2 && !hasDatePassed(currentSubscription?.trialEndsAt as string)) {
      return {
        message: 'Remove all drivers and delete all invitations to cancel the subscription.',
        status: 400,
      };
    }
    if (invitationCount >= 1 && hasDatePassed(currentSubscription?.trialEndsAt as string)) {
      return {
        message:
          'You trial period has been passed, remove all drivers and delete all invitations to cancel the subscription.',
        status: 400,
      };
    }
    if (!currentSubscription) {
      return {
        message: 'No subscription found.',
        status: 404,
      };
    }
    if (currentSubscription?.status === 'cancelled') {
      return {
        message: 'Subscription already cancelled.',
        status: 409,
      };
    }
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    currentSubscription.set({
      plan: 'FREE',
      oldPlan: currentSubscription.plan,
      status: 'cancelled',
      endsAt: new Date(canceledSubscription.current_period_end * 1000),
      updatedAt: Date.now(),
    });
    await currentSubscription.save();

    await sendEmail(
      {
        endDate: currentSubscription?.endsAt?.toISOString(),
      },
      currentSubscription?.user?.personalDetails?.email,
      TEMPLATES.INVITATION.SUBSCRIPTION_CANCELED,
      'wastedocket@secomind.ai'
    );

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'cancelSubscription',
      functionParams: [],
      additionalMessage: 'Subscription cancelled successfully.',
      startLogId: '',
    });

    return {
      message: 'Subscription cancelled successfully.',
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }
    return {
      message: err.message,
      status: 500,
    };
  }
}
