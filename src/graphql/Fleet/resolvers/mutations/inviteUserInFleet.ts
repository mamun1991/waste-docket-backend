import jwt from 'jsonwebtoken';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';
import sendEmail from '../../../../utils/sendEmailHandler';
import TEMPLATES from '../../../../constants/emailTemplateIDs';
import {AccountSubTypes, INVIATION_STATUS} from '../../../../constants/enums';
import Subscription from '../../../../MongoModels/Subscription';
import SubscriptionPlanLimit from '../../../../utils/SubscriptionPlanLimit';
import mongoose from 'mongoose';
import hasDatePassed from '../../../../utils/hasDatePassed';
import Stripe from 'stripe';

export default async function inviteUserInFleet(_: any, {fleetInvitationData}, context: any) {
  const ENV_VALUES = await AwsSecrets.getInstance();
  const stripe = new Stripe(
    ENV_VALUES.STRIPE_MODE === 'production'
      ? ENV_VALUES.STRIPE_SECRET_PRODUCTION_KEY
      : ENV_VALUES.STRIPE_SECRET_TEST_KEY,
    {
      apiVersion: '2023-10-16',
    }
  );
  const {email, fleetId} = fleetInvitationData;
  let startLogId: String = '';
  const {token} = context;
  let accessTokenSecret: string;
  let decodedToken: AccessToken;
  const functionParams = [
    {
      paramName: 'token',
      paramValue: 'HIDDEN_TOKEN',
      paramType: typeof token,
    },
    {
      paramName: 'email',
      paramValue: email,
      paramType: typeof email,
    },
  ];
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
    if (!decodedToken) {
      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'inviteUserInFleet',
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
      functionName: 'inviteUserInFleet',
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
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'inviteUserInFleet',
      functionParams: functionParams,
    });

    if (!(fleetId && email)) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: 'Fleet ID and Emails both are required.',
        startLogId,
      });

      return {
        status: 400,
        message: 'Fleet ID and Emails both are required.',
      };
    }

    const inviteeUser: any = await User.findOne({
      'personalDetails.email': {$regex: new RegExp(email, 'i')},
    }).populate('fleets');
    console.log(inviteeUser);

    if (inviteeUser) {
      const isInviteeHaveBusiness = inviteeUser?.fleets?.find(
        fleet => fleet?.ownerEmail?.toLowerCase() === email?.toLowerCase()
      );
      if (isInviteeHaveBusiness || inviteeUser?.accountSubType === AccountSubTypes.BUSINESS_ADMIN) {
        return {
          status: 409,
          message: 'A business owner cannot be added as a driver',
        };
      }
    }

    const fleet = await Fleet.findById(fleetId);

    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: 'Fleet Does Not Exist',
        startLogId,
      });

      return {
        status: 404,
        message: 'Fleet Does Not Exist',
      };
    }

    const requestSenderUser = await User.findById(decodedToken.UserId);
    const fleetCount = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(decodedToken.UserId),
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
    // Check for limit here
    const subscriptionData: any = await Subscription.findOne({user: requestSenderUser?._id});
    const maxLimit: any = SubscriptionPlanLimit(subscriptionData?.plan);
    const givenDate = new Date(subscriptionData?.endsAt);
    const currentDate = new Date();

    if (
      subscriptionData?.plan === 'FREE' &&
      subscriptionData?.status === 'trialing' &&
      hasDatePassed(subscriptionData?.trialEndsAt)
    ) {
      return {
        status: 403,
        message: `Your trial has been ended, upgrade plan to send invitation, Thank you!`,
      };
    }

    if (subscriptionData?.plan === 'FREE' && hasDatePassed(subscriptionData?.trialEndsAt)) {
      return {
        status: 403,
        message: `Your trialing period has been ended and you have not any active subscription, upgrade plan to send invitations. Thank you!`,
      };
    }

    // Check on stripe what is the stats of subscription
    if (subscriptionData?.stripeSubscriptionId) {
      const retrievedSubscription = await stripe.subscriptions.retrieve(
        subscriptionData?.stripeSubscriptionId
      );
      const subscriptionStatus: 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'active' =
        retrievedSubscription.status as 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'active';
      switch (subscriptionStatus) {
        case 'past_due':
        case 'unpaid':
          // subscriptionData.set({
          //   status: subscriptionStatus,
          //   updatedAt: Date.now()
          // });
          await subscriptionData.save();
          return {
            status: 403,
            message: `Your haven't paid yet, please check your balance or stripe account.`,
          };
        case 'canceled':
          subscriptionData.set({
            plan: 'FREE',
            status: subscriptionStatus,
            endsAt: new Date(retrievedSubscription.current_period_end * 1000),
            updatedAt: Date.now(),
          });
          await subscriptionData.save();
          break;
        default:
          break;
      }
    }

    // If user has not enough limit to send invitation, so need to update plan
    const count = fleetCount[0] ? fleetCount[0].count : 0;
    if (maxLimit !== 'unlimited' && count >= maxLimit) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: `You have ${subscriptionData?.plan} plan and ${maxLimit} ${
          maxLimit == 1 ? 'seat' : 'seats'
        } available that you used already, upgrade to increase seats. Thank you!`,
        startLogId,
      });

      return {
        status: 403,
        message: `You have ${subscriptionData?.plan} plan and ${maxLimit} ${
          maxLimit == 1 ? 'seat' : 'seats'
        } available that you used already, upgrade to increase seats. Thank you!`,
      };
    }

    // If subscription has been ended and current billing cycle has been ended
    if (
      subscriptionData?.status === 'cancelled' &&
      subscriptionData?.endsAt !== null &&
      givenDate < currentDate
    ) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: `Your Subscription has been cancelled and paid period ended. Upgrade to send invitations.`,
        startLogId,
      });
      return {
        status: 403,
        message: `Your Subscription has been cancelled and paid period ended. Upgrade to send invitations.`,
      };
    }

    if (requestSenderUser.personalDetails.email !== fleet.ownerEmail) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: 'Only Owner Can Invite Users In The Fleet.',
        startLogId,
      });

      return {
        status: 403,
        message: 'Only Owner Can Invite Users In The Fleet.',
      };
    }

    if (fleet.membersEmails.includes(email)) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: 'Email Already Exists In The Fleet.',
        startLogId,
      });

      return {
        status: 409,
        message: 'Email Already Exists In The Fleet.',
      };
    }

    const fleetInvitationPrevious = await FleetInvitation.findOne({
      inviteeEmail: email,
      fleetId: fleetId,
      status: 'PENDING',
    });

    if (fleetInvitationPrevious) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: 'Invitation has already been sent.',
        startLogId,
      });

      return {
        status: 409,
        message: 'Invitation has already been sent.',
      };
    }

    if (fleet.ownerEmail === email) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: 'Owner Email Cannot Invite Himself To The Fleet.',
        startLogId,
      });

      return {
        status: 500,
        message: 'Owner Email Cannot Invite Himself To The Fleet.',
      };
    }

    const user = await User.findOne({'personalDetails.email': email});

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'updateFleet',
        functionParams: functionParams,
        additionalMessage: `User does not exist. Sending E-mail Invite To ${email}.`,
        startLogId,
      });
      await sendEmail(
        {
          websiteLink: `http://www.wastedocket.ie/acceptInvites?driverEmail=${email}`,
          fleetName: fleet.name,
        },
        email,
        TEMPLATES.INVITATION.INVITE_USER,
        'wastedocket@secomind.ai'
      );
    }

    const fleetInvitation = await FleetInvitation.create({
      inviteeEmail: email,
      status: INVIATION_STATUS.PENDING,
      fleetId: fleet._id,
      fleetName: fleet.name,
      userId: user ? user._id : null,
    });

    await Fleet.findOneAndUpdate({_id: fleet._id}, {$push: {invitations: fleetInvitation._id}});
    if (user) {
      await User.updateOne(
        {'personalDetails.email': user.personalDetails.email},
        {$push: {invitations: fleetInvitation._id}}
      );
    } else {
      const newUser = await User.create({
        'personalDetails.email': email,
        'personalDetails.name': email.split('@')[0],
        invitations: [fleetInvitation?._id],
        accountSubType: AccountSubTypes.DRIVER,
      });
      await FleetInvitation.findByIdAndUpdate(fleetInvitation?._id, {
        userId: newUser?._id,
      });
    }
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'inviteUserInFleet',
      functionParams: functionParams,
      additionalMessage: `Invitation Sent To ${email}`,
      startLogId,
    });

    return {
      status: 200,
      message: `Invitation Sent To ${email}`,
    };

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'inviteUserInFleet',
      functionParams: functionParams,
      additionalMessage: 'Query Unsuccessful | isBusiness or isIndividual must be true',
      startLogId,
    });

    return {
      status: 500,
      message: 'Query Unsuccessful | isBusiness or isIndividual must be true',
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'inviteUserInFleet',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
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
      functionName: 'inviteUserInFleet',
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
