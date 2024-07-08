import FleetInvitation from '../../../../MongoModels/FleetInvitation';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';

export default async function getPendingInvitationsByEmail(_: any, data: any) {
  let startLogId: String;
  const {driverEmail} = data;
  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'getPendingInvitationsByEmail',
      functionParams: [
        {
          paramName: 'driverEmail',
          paramValue: driverEmail,
          paramType: typeof driverEmail,
        },
      ],
    });

    if (!driverEmail) {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getPendingInvitationsByToken',
        functionParams: [
          {
            paramName: 'driverEmail',
            paramValue: driverEmail,
            paramType: typeof driverEmail,
          },
        ],
        additionalMessage: 'Driver Email not found.',
        startLogId,
      });

      return {
        invitations: null,
        response: {
          message: 'Driver Email not found',
          status: 401,
        },
      };
    }
    const FleetInvitationDoc = await FleetInvitation.find({
      inviteeEmail: driverEmail,
      status: 'PENDING',
    }).populate('fleetId');

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.INFO,
      functionName: 'getPendingInvitationsByEmail',
      functionParams: [
        {
          paramName: 'driverEmail',
          paramValue: driverEmail,
          paramType: typeof driverEmail,
        },
      ],
      additionalMessage: 'Query Successful',
      startLogId,
    });
    return {
      invitations: FleetInvitationDoc || [],
      response: {
        message: 'Query Successful',
        status: 200,
      },
    };
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getPendingInvitationsByEmail',
      functionParams: [
        {
          paramName: 'driverEmail',
          paramValue: driverEmail,
          paramType: typeof driverEmail,
        },
      ],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      invitations: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
