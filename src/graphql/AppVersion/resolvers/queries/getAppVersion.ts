import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AppVersion from '../../../../MongoModels/appVersion';

export default async function getAppVersion(_: any, {}, _context: any) {
  let startLogId: String;

  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'getAppVersion',
      functionParams: [],
    });

    const appVersion = await AppVersion.findOne().sort({createdAt: 1});

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getAppVersion',
      functionParams: [],
      additionalMessage: 'Query successful!',
      startLogId,
    });

    return {
      appVersion,
      response: {
        message: 'Query Successful!',
        status: 200,
      },
    };
  } catch (err) {
    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getAppVersion',
      functionParams: [],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      appVersion: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
