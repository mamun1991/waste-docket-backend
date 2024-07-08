import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../utils/createApiLog';

export default async function policiesURL() {
  await createApiLog({
    type: ApiLogTypes.QUERY_START,
    level: ApiLogLevels.INFO,
    functionName: 'policiesURL',
    functionParams: [],
    additionalMessage: 'policiesURL',
  });

  await createApiLog({
    type: ApiLogTypes.QUERY_END,
    level: ApiLogLevels.INFO,
    functionName: 'policiesURL',
    functionParams: [],
    additionalMessage: 'policiesURL',
  });

  return {
    response: {
      message: 'Policies URL Response Success',
      status: 200,
    },
    privacyPolicyURL: 'http://www.wastedocket.ie/privacyPolicy/',
    termsOfServiceURL: 'http://www.wastedocket.ie/tos',
    gdprURL: 'http://www.wastedocket.ie/gdprPolicy/',
  };
}
