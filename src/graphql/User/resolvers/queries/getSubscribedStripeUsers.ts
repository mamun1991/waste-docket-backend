import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';

import Stripe from 'stripe';

export default async function getSubscribedStripeUsers(
  parent: any,
  {
    token,
    pageNumber,
    pageSize,
    starting_after,
    paginationMode,
  }: {
    token: string;
    pageNumber: number;
    pageSize: number;
    starting_after: string;
    paginationMode: string;
  },
  context: any,
  info: any
) {
  let startLogId: String;

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
        functionName: 'getSubscribedStripeUsers',
        functionParams: [
          {
            paramName: 'token',
            paramValue: token,
            paramType: typeof token,
          },
        ],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        data: null,
        totalCount: 0,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getUserById',
      functionParams: [
        {
          paramName: 'token',
          paramValue: 'HIDDEN_TOKEN',
          paramType: typeof token,
        },
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
      additionalMessage: err.message,
      startLogId,
    });
    return {
      data: null,
      totalCount: 0,
      response: {
        message: err.message,
        status: 500,
      },
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

    // Fetch customers for the current page
    const customers =
      paginationMode === 'prev'
        ? await stripe.customers.list({
            limit: pageSize,
            ending_before: starting_after === 'undefined' ? undefined : starting_after,
          })
        : await stripe.customers.list({
            limit: pageSize,
            starting_after: starting_after === 'undefined' ? undefined : starting_after,
          });

    const customersWithSubscriptions = await Promise.all(
      customers.data.map(async (customer: Stripe.Customer) => {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active', // Filter active subscriptions
          expand: ['data.plan.product'], // Expand product information
        });
        const subscriptionData: any = subscriptions.data[0]; // Customer has only one active subscription

        let productName = null;
        if (subscriptionData && subscriptionData.plan && subscriptionData.plan.product) {
          productName = subscriptionData.plan.product.name;
        }

        return {
          customerId: customer.id,
          email: customer.email,
          default_payment_method: customer?.invoice_settings?.default_payment_method,
          name: customer?.name,
          phone: customer?.phone,
          subscriptionId: subscriptionData?.id || null,
          collection_method: subscriptionData?.collection_method || null,
          currency: subscriptionData?.currency || null,
          latest_invoice: subscriptionData?.latest_invoice || null,
          subscriptionStatus: subscriptionData?.status || null,
          productName: productName,
          isSubscriptionCancelled: subscriptionData?.canceled_at || null,
        };
      })
    );

    // Fetch total customer count
    const totalCount = await getTotalCustomerCount(stripe);

    return {
      data: customersWithSubscriptions,
      totalCount,
      response: {
        message: 'Query Successful',
        status: 200,
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getUserById',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });
      return {
        data: null,
        totalCount: 0,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getSubscribedStripeUsers',
      functionParams: [
        {paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token},
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
      ],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      data: null,
      totalCount: 0,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}

// Fetch total customer count
async function getTotalCustomerCount(stripe: Stripe): Promise<number> {
  let totalCount = 0;
  let hasMore = true;
  let startingAfter: string | undefined = undefined;

  while (hasMore) {
    const customers = await stripe.customers.list({limit: 100, starting_after: startingAfter});
    totalCount += customers.data.length;
    startingAfter = customers.data[customers.data.length - 1]?.id;
    hasMore = customers.has_more;
  }

  return totalCount;
}
