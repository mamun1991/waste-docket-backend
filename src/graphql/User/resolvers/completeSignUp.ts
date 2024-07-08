import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {AccessToken} from '../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../utils/createApiLog';
import AwsSecrets from '../../../utils/getAwsSecrets';
import User from '../../../MongoModels/User';
import Fleet from '../../../MongoModels/Fleet';
import Subscription from '../../../MongoModels/Subscription';
import {AccountSubTypes} from '../../../constants/enums';
import FleetInvitation from '../../../MongoModels/FleetInvitation';
import TEMPLATES from '../../../constants/emailTemplateIDs';
import sendEmail from '../../../utils/sendEmailHandler';

export default async function completeSignUp(
  _: any,
  {
    name,
    VAT,
    permitNumber,
    permitHolderName,
    permitHolderAddress,
    permitHolderContactDetails,
    prefix,
    isIndividual,
    isBusiness,
  },
  context: any
) {
  let startLogId: String = '';
  const {token} = context;
  let accessTokenSecret: string;
  let decodedToken: AccessToken;
  const ENV_VALUES = await AwsSecrets.getInstance();

  const functionParams = [
    {
      paramName: 'token',
      paramValue: 'HIDDEN_TOKEN',
      paramType: typeof token,
    },
    {
      paramName: 'name',
      paramValue: name,
      paramType: typeof name,
    },
    {
      paramName: 'VAT',
      paramValue: VAT,
      paramType: typeof VAT,
    },
    {
      paramName: 'permitNumber',
      paramValue: permitNumber,
      paramType: typeof permitNumber,
    },
    {
      paramName: 'isIndividual',
      paramValue: isIndividual,
      paramType: typeof isIndividual,
    },
    {
      paramName: 'isBusiness',
      paramValue: isBusiness,
      paramType: typeof isBusiness,
    },
  ];
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;

    if (!decodedToken) {
      return {
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'completeSignUp',
        functionParams: functionParams,
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'completeSignUp',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      response: {
        message: err.message,
        status: 500,
      },
    };
  }

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'completeSignUp',
      functionParams: functionParams,
    });

    if (!(isIndividual || isBusiness)) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'completeSignUp',
        functionParams: functionParams,
        additionalMessage: 'Either isBusiness or isIndividual must be true',
        startLogId,
      });

      return {
        response: {
          status: 500,
          message: 'Either isBusiness or isIndividual must be true',
        },
        pendingInvites: [],
        fleets: [],
      };
    }
    const userId = new mongoose.Types.ObjectId(decodedToken.UserId);
    const user: any = await User.findById(userId);
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
    const currentSubscription: any = await Subscription.findOne({user: user?._id});

    if (isIndividual && isBusiness) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'completeSignUp',
        functionParams: functionParams,
        additionalMessage: 'Please select either isBusiness or isIndividual.',
        startLogId,
      });

      return {
        response: {
          status: 500,
          message: 'Please select either isBusiness or isIndividual.',
        },
        pendingInvites: [],
        fleets: [],
      };
    }
    if (isIndividual) {
      if (!permitNumber) {
        await createApiLog({
          type: ApiLogTypes.QUERY_END,
          level: ApiLogLevels.INFO,
          functionName: 'completeSignUp',
          functionParams: functionParams,
          additionalMessage: 'Please Provide Permit Number',
          startLogId,
        });

        return {
          response: {
            status: 500,
            message: 'Please Provide Permit Number',
          },
          pendingInvites: [],
          fleets: [],
        };
      }

      const fleet = await Fleet.findOneAndUpdate(
        {ownerEmail: user.personalDetails.email},
        {
          isIndividual: true,
          name: user.personalDetails.name,
          ownerEmail: user.personalDetails.email,
          permitNumber,
          membersEmails: [],
        },
        {upsert: true, new: true, setDefaultsOnInsert: true}
      );
      await User.updateOne(
        {'personalDetails.email': user.personalDetails.email},
        {
          $set: {
            isSignUpComplete: true,
            selectedFleet: fleet._id,
          },
          $push: {
            fleets: fleet._id,
          },
        }
      );
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'completeSignUp',
        functionParams: functionParams,
        additionalMessage: 'Individual Type Of Fleet Created',
        startLogId,
      });

      return {
        response: {
          status: 200,
          message: 'Individual Type Of Fleet Created',
        },
        pendingInvites: [],
        fleets: [fleet],
      };
    }

    if (isBusiness) {
      if (!(permitNumber && name && VAT)) {
        await createApiLog({
          type: ApiLogTypes.QUERY_END,
          level: ApiLogLevels.INFO,
          functionName: 'completeSignUp',
          functionParams: functionParams,
          additionalMessage: 'Please Provide Name, VAT and Permit Number for Business Type.',
          startLogId,
        });

        return {
          response: {
            status: 500,
            message: 'Please Provide Name, VAT and Permit Number for Business Type.',
          },
          pendingInvites: [],
          fleets: [],
        };
      }
      const fleet = await Fleet.create({
        isIndividual: false,
        name,
        permitNumber,
        permitHolderName,
        permitHolderAddress,
        permitHolderContactDetails,
        VAT,
        prefix,
        docketNumber: 0,
        individualDocketNumber: '0',
        ownerEmail: user.personalDetails.email,
        membersEmails: [],
      });
      await User.updateOne(
        {'personalDetails.email': user.personalDetails.email},
        {
          $set: {
            isSignUpComplete: true,
            selectedFleet: fleet._id,
            accountSubType: AccountSubTypes.BUSINESS_ADMIN,
          },
          $push: {
            fleets: fleet._id,
          },
        }
      );

      const invitationsToDelete = await FleetInvitation.find({
        userId: user?._id,
      });
      const deleteResult = await FleetInvitation.deleteMany({
        userId: user?._id,
      });
      const deleteCount = deleteResult.deletedCount || 0;
      if (deleteCount > 0) {
        const fleetIds = invitationsToDelete.map(invitation => invitation.fleetId);
        await Fleet.updateMany(
          {_id: {$in: fleetIds}},
          {$pull: {invitations: {$in: invitationsToDelete.map(invitation => invitation._id)}}}
        );
        await User.updateOne(
          {_id: user._id},
          {$pull: {invitations: {$in: invitationsToDelete.map(invitation => invitation._id)}}}
        );
      }

      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'completeSignUp',
        functionParams: functionParams,
        additionalMessage: 'Business Type Of Fleet Created',
        startLogId,
      });

      const existingSubscription = await Subscription.findOne({
        user: user?._id,
      });
      // If no subscription exists, create a new one
      if (!existingSubscription) {
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

      await sendEmail(
        {
          businessName: name,
          businessEmail: user.personalDetails.email,
          trialEndingDate: currentSubscription?.trialEndsAt?.toISOString(),
        },
        user?.personalDetails?.email,
        TEMPLATES.INVITATION.WELCOME_BUSINESS
      );

      return {
        response: {
          status: 200,
          message: 'Business Type Of Fleet Created',
        },
        pendingInvites: [],
        fleets: [fleet],
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'completeSignUp',
      functionParams: functionParams,
      additionalMessage: 'Query Unsuccessful | isBusiness or isIndividual must be true',
      startLogId,
    });
    await sendEmail(
      {
        businessName: name,
        businessEmail: user.personalDetails.email,
        trialEndingDate: currentSubscription?.trialEndsAt?.toISOString(),
      },
      user?.personalDetails?.email,
      TEMPLATES.INVITATION.WELCOME_BUSINESS
    );

    return {
      response: {
        status: 500,
        message: 'Query Unsuccessful | isBusiness or isIndividual must be true',
      },
      pendingInvites: [],
      fleets: [],
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'completeSignUp',
        functionParams: [{paramName: 'token', paramValue: 'HIDDEN_TOKEN', paramType: typeof token}],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        userData: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'completeSignUp',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      userData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
