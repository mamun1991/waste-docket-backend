import jwt from 'jsonwebtoken';
import AWS from 'aws-sdk';
import {AccountTypes} from '../constants/enums';
import {AccessToken} from '../constants/types';
import User from '../MongoModels/User';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../utils/createApiLog';
import AwsSecrets from '../utils/getAwsSecrets';

const deleteDocumentFromBucket = async (fileUrl: string) => {
  const ENV_VALUES = await AwsSecrets.getInstance();
  AWS.config.update({
    region: ENV_VALUES.AWS_S3_REGION,
  });

  const S3 = new AWS.S3();

  S3.deleteObject(
    {
      Bucket: ENV_VALUES.AWS_S3_ASSETS,
      Key: fileUrl,
    },
    (err, data) => {
      if (err) console.log(err);
      else console.log(data);
    }
  );
};

export default async function deleteCollectionDocumentFromBucket(_, {fileUrl, accessToken}) {
  const ENV_VALUES = await AwsSecrets.getInstance();
  const accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
  let startLogId: String;

  try {
    const decodedToken = jwt.verify(accessToken, accessTokenSecret) as unknown as AccessToken;
    startLogId = await createApiLog({
      type: ApiLogTypes.MUTATION_START,
      level: ApiLogLevels.INFO,
      functionName: 'deleteFileFromBucket',
      functionParams: [
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
        {
          paramName: 'fileUrl',
          paramValue: fileUrl,
          paramType: typeof fileUrl,
        },
      ],
    });

    if (fileUrl) {
      const user = await User.findOne({
        _id: decodedToken.UserId,
      }).orFail(() => new Error('User Not Found'));
      if (!(user?.accountType === AccountTypes.ADMIN || user?.accountType === AccountTypes.USER)) {
        return {
          message: 'Only Valid User is Allowed To Perform This Operation',
          status: 401,
        };
      }

      try {
        await deleteDocumentFromBucket(fileUrl);

        // await Site.updateOne({_id: documentId}, {$set: {plantModel: ''}});
      } catch (error) {
        console.log(error);
      }

      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.INFO,
        functionName: 'deleteFileFromBucket',
        functionParams: [
          {
            paramName: 'userId',
            paramValue: decodedToken.UserId,
            paramType: typeof decodedToken.UserId,
          },
          {
            paramName: 'fileUrl',
            paramValue: fileUrl,
            paramType: typeof fileUrl,
          },
        ],
        additionalMessage: `Document Deleted Successfully`,
        startLogId,
      });
      console.log('Document Deleted Successfully');
      return {
        message: 'Document Deleted Successfully',
        status: 200,
      };
    }

    return {
      message: 'No Condition Matched',
      status: 500,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'deleteFileFromBucket',
        functionParams: [
          {
            paramName: 'fileUrl',
            paramValue: fileUrl,
            paramType: typeof fileUrl,
          },
        ],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });
      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }

    const decodedToken = jwt.verify(accessToken, accessTokenSecret) as unknown as AccessToken;
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.ERROR,
      functionName: 'deleteFileFromBucket',
      functionParams: [
        {
          paramName: 'userId',
          paramValue: decodedToken.UserId,
          paramType: typeof decodedToken.UserId,
        },
        {
          paramName: 'fileUrl',
          paramValue: fileUrl,
          paramType: typeof fileUrl,
        },
      ],
      additionalMessage: err.message,
      startLogId,
    });
    return {
      message: err.message,
      status: 500,
    };
  }
}
