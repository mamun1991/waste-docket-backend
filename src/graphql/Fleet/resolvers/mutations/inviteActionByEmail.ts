import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import Fleet from '../../../../MongoModels/Fleet';
import FleetInvitation from '../../../../MongoModels/FleetInvitation';
import User from '../../../../MongoModels/User';
import {AccountSubTypes, INVIATION_STATUS} from '../../../../constants/enums';
import sendEmail from '../../../../utils/sendEmailHandler';
import TEMPLATES from '../../../../constants/emailTemplateIDs';

export default async function inviteActionByEmail(
  _: any,
  {fleetId, action, dontChangeSelectedFleet, driverEmail}
) {
  let startLogId: String = '';
  const functionParams = [
    {
      paramName: 'fleetId',
      paramValue: fleetId,
      paramType: typeof fleetId,
    },
    {
      paramName: 'action',
      paramValue: action,
      paramType: typeof action,
    },
    {
      paramName: 'dontChangeSelectedFleet',
      paramValue: dontChangeSelectedFleet,
      paramType: typeof dontChangeSelectedFleet,
    },
  ];

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'inviteActionByEmail',
      functionParams: functionParams,
    });

    const fleet = await Fleet.findById(fleetId);
    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'inviteActionByEmail',
        functionParams: functionParams,
        additionalMessage: 'Fleet Does Not Exist',
        startLogId,
      });

      return {
        status: 404,
        message: 'Fleet Does Not Exist',
      };
    }

    const user = await User.findOne({'personalDetails.email': driverEmail});

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getPendingInvitationsByToken',
        functionParams: [
          {paramName: 'driverEmail', paramValue: 'HIDDEN_TOKEN', paramType: typeof driverEmail},
        ],
        additionalMessage: 'User does not exist',
        startLogId,
      });

      return {
        message: 'User does not exist',
        status: 404,
      };
    }

    const FleetInvitationDoc = await FleetInvitation.findOne({
      inviteeEmail: user?.personalDetails?.email,
      fleetId: fleetId,
      status: INVIATION_STATUS.PENDING,
    });
    if (!FleetInvitationDoc) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getPendingInvitationsByToken',
        functionParams: [
          {paramName: 'driverEmail', paramValue: 'driverEmail', paramType: typeof driverEmail},
        ],
        additionalMessage: 'Invitation does not exist',
        startLogId,
      });

      return {
        message: 'Invitation does not exist',
        status: 401,
      };
    }

    if (FleetInvitationDoc.inviteeEmail !== user?.personalDetails?.email) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getPendingInvitationsByToken',
        functionParams: [
          {paramName: 'driverEmail', paramValue: 'driverEmail', paramType: typeof driverEmail},
        ],
        additionalMessage: 'Invitation does not belong to this user.',
        startLogId,
      });

      return {
        message: 'Invitation does not belong to this user.',
        status: 401,
      };
    }

    if (action === INVIATION_STATUS.ACCEPTED) {
      await FleetInvitation.findByIdAndUpdate(FleetInvitationDoc._id, {
        $set: {status: INVIATION_STATUS.ACCEPTED, userId: user._id},
      });
      await Fleet.findByIdAndUpdate(fleet._id, {
        $push: {membersEmails: user?.personalDetails?.email},
      });
      if (dontChangeSelectedFleet) {
        await User.findByIdAndUpdate(user._id, {
          $push: {fleets: fleet._id},
          $set: {
            accountSubType: AccountSubTypes.DRIVER,
          },
        });
      } else {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            isSignUpComplete: true,
            selectedFleet: fleet._id,
            accountSubType: AccountSubTypes.DRIVER,
          },
          $push: {fleets: fleet._id},
        });
      }
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'inviteActionByEmail',
        functionParams: functionParams,
        additionalMessage: `Invitation Action Performed: ${action}`,
        startLogId,
      });

      return {
        status: 200,
        message: `Invitation Action Performed: ${action}`,
      };
    }

    if (action === INVIATION_STATUS.REJECTED) {
      const deletedInvitations = await FleetInvitation.findByIdAndDelete(FleetInvitationDoc._id);
      const fleetId = deletedInvitations?.fleetId;
      await Fleet.updateOne({_id: fleetId}, {$pull: {invitations: FleetInvitationDoc._id}});
      await User.updateOne({_id: user._id}, {$pull: {invitations: FleetInvitationDoc._id}});
      const invitations = await FleetInvitation.find({
        inviteeEmail: driverEmail,
        status: 'PENDING',
      });
      if (user?.fleets?.length === 0 && invitations?.length === 0) {
        await User.findByIdAndDelete(user?._id);
      }
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.INFO,
        functionName: 'inviteActionByEmail',
        functionParams: functionParams,
        additionalMessage: `Invitation Action Performed: ${action}`,
        startLogId,
      });
      const fleetOwnerEmail: any = fleet?.ownerEmail;
      if (driverEmail && fleetOwnerEmail) {
        await sendEmail(
          {
            driverEmail,
          },
          fleetOwnerEmail,
          TEMPLATES.INVITATION.REJECT_USER,
          'wastedocket@secomind.ai'
        );
      }
      return {
        status: 200,
        message: `Invitation Action Performed: ${action}`,
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'inviteActionByEmail',
      functionParams: functionParams,
      additionalMessage: 'Query Unsuccessful | No Action Matched.',
      startLogId,
    });

    return {
      status: 500,
      message: 'Query Unsuccessful | No Action Matched.',
    };
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'inviteActionByEmail',
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
