import Stripe from 'stripe';
import Subscription from '../../../../MongoModels/Subscription';
import User from '../../../../MongoModels/User';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import StripePriceID from '../../../../utils/StripePriceID';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import mongoose from 'mongoose';
import preventDowngrade from '../../../../utils/preventDowngrade';
import sendEmail from '../../../../utils/sendEmailHandler';
import TEMPLATES from '../../../../constants/emailTemplateIDs';

let startLogId: String = '';

export default async function createSubscription(
  _parent,
  {paymentMethodId, plan: userSelectedPlan, user, mode}
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

  let customerId = '';
  try {
    const stripePriceId: string = StripePriceID(userSelectedPlan, ENV_VALUES) as string;
    const currentUser = await User.findById({_id: user});
    const currentSubscription: any = await Subscription.findOne({user}).populate('user');
    customerId = currentSubscription?.stripeCustomerId as string;
    if (!currentSubscription?.stripeProductId) {
      const createCustomer = await stripe.customers.create({
        payment_method: paymentMethodId,
        email: currentUser.personalDetails.email as string,
        name: currentUser.personalDetails.name as string,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      customerId = createCustomer.id;
    } else {
      const fleetCount = await User.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(currentUser._id),
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
      const message = preventDowngrade(invitationCount, userSelectedPlan);
      if (message)
        return {
          message: message,
          status: 400,
        };

      // Cancel the subscription IF already exist
      if (currentSubscription?.status !== 'cancelled') {
        await stripe.subscriptions.update(currentSubscription?.stripeSubscriptionId as string, {
          cancel_at_period_end: true,
        });
      }
    }
    // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{price: stripePriceId}],
    });
    const {id, customer, status, plan, created, current_period_end}: any = subscription;
    const {product, nickname, interval, interval_count} = plan;

    if (status === 'incomplete') {
      if (currentSubscription?.stripeCustomerId)
        await stripe.customers.del(currentSubscription?.stripeCustomerId as string);
      return {
        message: 'Failed, Please check your card balance or contact to your card provider.',
        status: 400,
      };
    }

    // Update the subscription with the new values
    if (currentSubscription) {
      currentSubscription.set({
        plan: userSelectedPlan,
        oldPlan: null,
        status,
        startAt: new Date(created * 1000), // Convert UNIX timestamp to JavaScript Date
        endsAt: null, // Convert UNIX timestamp to JavaScript Date
        stripeSubscriptionId: id,
        stripeCustomerId: customer,
        stripeProductId: product,
        stripePriceId: stripePriceId,
        updatedAt: Date.now(),
      });
      await currentSubscription.save();
    } else {
      await Subscription.create({
        user: user,
        oldPlan: null,
        plan: userSelectedPlan,
        status,
        startAt: new Date(created * 1000), // Convert UNIX timestamp to JavaScript Date
        trialEndsAt: Date.now(),
        endsAt: null, // Convert UNIX timestamp to JavaScript Date
        stripeSubscriptionId: id,
        stripeCustomerId: customer,
        stripeProductId: product,
        stripePriceId: stripePriceId,
      });
    }
    const oldPlan = currentSubscription.oldPlan
      ? currentSubscription.oldPlan
      : currentSubscription.plan;
    await sendEmail(
      {
        oldPlan,
        newPlan: userSelectedPlan,
      },
      currentUser.personalDetails.email as string,
      TEMPLATES.INVITATION.PLAN_CHANGED
    );
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'createSubscription',
      functionParams: [],
      additionalMessage: 'Subscription created successfully',
      startLogId,
    });
    return {
      message: 'Subscription created successfully',
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
