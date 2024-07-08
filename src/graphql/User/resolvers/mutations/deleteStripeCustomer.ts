import Stripe from 'stripe';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Subscription from '../../../../MongoModels/Subscription';

export default async function deleteStripeCustomer(
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

  if (!customerId) {
    return {
      message: 'CustomerId is required',
      status: 400,
    };
  }

  try {
    const currentSubscription = await Subscription.findOne({stripeCustomerId: customerId});
    // Check if customer exists
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer) {
      return {
        message: 'Customer does not exist',
        status: 400,
      };
    }

    // Customer exists, delete them
    await stripe.customers.del(customerId);
    console.log(currentSubscription);
    if (currentSubscription?.plan === 'FREE') {
      console.log('yes');
      currentSubscription.set({
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeProductId: null,
        updatedAt: Date.now(),
      });
      await currentSubscription.save();
    }

    return {
      message: `Customer has been deleted successfully.`,
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
