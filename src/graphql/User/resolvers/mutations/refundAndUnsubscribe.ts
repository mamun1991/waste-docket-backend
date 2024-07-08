import Stripe from 'stripe';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Subscription from '../../../../MongoModels/Subscription';
import hasDatePassed from '../../../../utils/hasDatePassed';
import User from '../../../../MongoModels/User';
import mongoose from 'mongoose';

export default async function refundAndUnsubscribe(
  _parent,
  {latest_invoice, customerId, email, subscriptionId, productName}
) {
  let ENV_VALUES = await AwsSecrets.getInstance();
  const stripe = new Stripe(
    ENV_VALUES.STRIPE_MODE === 'production'
      ? ENV_VALUES.STRIPE_SECRET_PRODUCTION_KEY
      : ENV_VALUES.STRIPE_SECRET_TEST_KEY,
    {
      apiVersion: '2023-10-16',
    }
  );
  if (!latest_invoice) {
    return {
      message: 'Latest Invoice ID is required',
      status: 400,
    };
  }

  try {
    // Cancel subscription first
    const currentSubscription = await Subscription.findOne({stripeSubscriptionId: subscriptionId});
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
        status: 400,
      };
    }
    if (currentSubscription?.status === 'cancelled') {
      return {
        message: 'Subscription already cancelled.',
        status: 400,
      };
    }

    // Retrieve the latest invoice
    const latestInvoice = await stripe.invoices.retrieve(latest_invoice);
    if (!latestInvoice) {
      return {
        message: 'No invoice found with the provided ID',
        status: 400,
      };
    }

    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    const paymentIntentId = latestInvoice.payment_intent;

    // Process refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId as string, // Explicitly cast to string
    });

    if (refund.status !== 'succeeded') {
      const failureReason = refund.failure_reason || 'Unknown reason';
      return {
        message: `The refund rejected: reason: ${failureReason}`,
        status: 400,
      };
    }

    currentSubscription.set({
      plan: 'FREE',
      oldPlan: currentSubscription.plan,
      status: 'cancelled',
      endsAt: new Date(canceledSubscription.current_period_end * 1000),
      updatedAt: Date.now(),
    });
    await currentSubscription.save();

    return {
      message: `Refund initiated, Refunds take 5-10 days to appear on a customer's statement. Stripe's fees for the original payment won't be returned, but there are no additional fees for the refund.`,
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
