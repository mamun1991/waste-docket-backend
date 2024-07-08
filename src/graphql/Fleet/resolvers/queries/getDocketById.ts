import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../../../../MongoModels/User';
import Docket from '../../../../MongoModels/Docket';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';

export default async function getDocketById(_: any, {docketId}, context: any) {
  let startLogId: String;
  const {token} = context;
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
        functionName: 'getDocketById',
        functionParams: [
          {
            paramName: 'docketId',
            paramValue: docketId,
            paramType: typeof docketId,
          },
          {
            paramName: 'token',
            paramValue: 'HIDDEN_TOKEN',
            paramType: typeof token,
          },
        ],
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
      functionName: 'getDocketById',
      functionParams: [
        {
          paramName: 'docketId',
          paramValue: docketId,
          paramType: typeof docketId,
        },
        {
          paramName: 'token',
          paramValue: 'HIDDEN_TOKEN',
          paramType: typeof token,
        },
      ],
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

  const functionParams = [
    {
      paramName: 'docketId',
      paramValue: docketId,
      paramType: typeof docketId,
    },
    {
      paramName: 'token',
      paramValue: 'HIDDEN_TOKEN',
      paramType: typeof token,
    },
  ];
  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'getDocketById',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getDocketById',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        docketData: null,
        response: {
          message: 'User not found',
          status: 404,
        },
      };
    }

    let DocketData = await Docket.findById(docketId);

    const objectId = new mongoose.Types.ObjectId(docketId);

    const pipeline = [
      {$match: {_id: objectId}},

      {
        $lookup: {
          from: 'CustomerContacts',
          localField: 'customerContact',
          foreignField: '_id',
          as: 'customerContact',
        },
      },

      {$unwind: '$customerContact'},
      {
        $lookup: {
          from: 'destinationFacility',
          localField: 'destinationFacility',
          foreignField: '_id',
          as: 'destinationFacility',
        },
      },
      {
        $unwind: {
          path: '$destinationFacility',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const aggregatedData = await Docket.aggregate(pipeline);
    DocketData = aggregatedData.length > 0 ? aggregatedData[0] : null;

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getDocketById',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      docketData: DocketData,
      response: {
        message: 'Query Successful!',
        status: 200,
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getDocketById',
        functionParams: functionParams,
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        docketData: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getDocketById',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      docketData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
