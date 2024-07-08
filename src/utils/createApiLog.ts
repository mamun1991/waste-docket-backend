import ApiLog from '../MongoModels/ApiLog';

type FunctionParam = {
  paramName: String;
  paramValue: any;
  paramType: String;
};

export enum ApiLogTypes {
  QUERY_START = 'QUERY_START',
  QUERY_END = 'QUERY_END',
  MUTATION_START = 'MUTATION_START',
  MUTATION_END = 'MUTATION_END',
  CRON_JOB_START = 'CRON_JOB_START',
  CRON_JOB_END = 'CRON_JOB_END',
  API_PROCESSING_START = 'API_PROCESSING_START',
  API_PROCESSING_END = 'API_PROCESSING_END',
}

export enum ApiLogLevels {
  INFO = 'INFO',
  ERROR = 'ERROR',
}

export type ApiLogConfig = {
  type: ApiLogTypes;
  level: ApiLogLevels;
  functionName: String;
  functionParams: FunctionParam[];
  additionalMessage?: String;
  startLogId?: String;
};

export default async function createApiLog(config: ApiLogConfig): Promise<String> {
  try {
    const {type, level, functionName, functionParams, additionalMessage, startLogId} = config;

    const convertedStartLogId = startLogId || '';

    if (LOG_FILTER_TYPES.includes(type) && LOG_FILTER_LEVELS.includes(level)) {
      const convertedParams = functionParams.map(param => {
        const convertedParamValue = JSON.stringify(param.paramValue);
        param.paramValue = convertedParamValue;
        return param;
      });

      const createdLog = await ApiLog.create({
        type,
        level,
        functionName,
        functionParams: convertedParams,
        additionalMessage,
        startLogId: convertedStartLogId,
      });

      return createdLog._id.valueOf().toString();
    }

    return '';
  } catch (err) {
    const convertedStartLogId = config.startLogId || '';
    await ApiLog.create({
      type: 'API_LOG_CREATION',
      level: 'ERROR',
      functionName: 'createApiLog',
      functionParams: [
        {paramName: 'config', paramValue: JSON.stringify(config), paramType: typeof config},
      ],
      additionalMessage: `Unknown Error: ${err.message}`,
      startLogId: convertedStartLogId,
    });
    return '';
  }
}
