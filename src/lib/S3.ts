import AWS from 'aws-sdk';
import stream from 'stream';
import jwt from 'jsonwebtoken';
import cuid from 'cuid';
import dayjs from 'dayjs';
import {AccessToken, File, IUploader, Response} from '../constants/types';
import User from '../MongoModels/User';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../utils/createApiLog';
import AwsSecrets from '../utils/getAwsSecrets';
import {S3_BUCKET_FILENAME} from '../constants/enums';

type S3UploadStream = {
  writeStream: stream.PassThrough;
  promise: Promise<AWS.S3.ManagedUpload.SendData>;
};

export class AWSS3Uploader implements IUploader {
  private s3: AWS.S3;

  constructor() {
    AWS.config = new AWS.Config();
    AWS.config.update({
      region: 'us-west-2',
    });

    this.s3 = new AWS.S3();
  }

  async singleFileUploadResolver(
    _,
    {
      file,
      accessToken,
      uploadType,
      documentId,
    }: {file: Promise<File>; accessToken: string; uploadType: string; documentId: string}
  ): Promise<Response> {
    let startLogId: String;
    // eslint-disable-next-line no-async-promise-executor
    const resolverPromise: Response = await new Promise<Response>(async (res, rej) => {
      const SECRETS = await AwsSecrets.getInstance();
      const accessTokenSecret = SECRETS.JWT_ACCESS_TOKEN_SECRET;
      const decodedToken = jwt.verify(accessToken, accessTokenSecret) as unknown as AccessToken;

      const fileWaited = await file;
      const {createReadStream, filename, mimetype, encoding} = await fileWaited.file;

      const generatedFileName = `${dayjs().format('DDMMYY')}${cuid()}.${filename.split('.')[1]}`;

      startLogId = await createApiLog({
        type: ApiLogTypes.MUTATION_START,
        level: ApiLogLevels.INFO,
        functionName: 'singleFileUpload',
        functionParams: [
          {paramName: 'uploadType', paramValue: uploadType, paramType: typeof uploadType},
          {paramName: 'documentId', paramValue: documentId, paramType: typeof documentId},
          {
            paramName: 'userId',
            paramValue: decodedToken.UserId,
            paramType: typeof decodedToken.UserId,
          },
          {paramName: 'filename', paramValue: filename, paramType: typeof filename},
          {paramName: 'mimetype', paramValue: mimetype, paramType: typeof mimetype},
          {paramName: 'encoding', paramValue: encoding, paramType: typeof encoding},
        ],
      });

      // Create an upload stream that goes to S3
      const uploadStream = this.createUploadStream(generatedFileName);

      // Pipe the file data into the upload stream
      const readStream = createReadStream();
      readStream.on('error', err => {
        rej(err);
      });

      readStream.pipe((await uploadStream).writeStream);

      const result = (await uploadStream).promise;

      // // Get the link representing the uploaded file
      const link = (await result).Location;
      // // save it to our database
      const {UserId} = decodedToken;
      if (
        uploadType === S3_BUCKET_FILENAME.CUSTOMER_LOGO_UPLOAD ||
        uploadType === S3_BUCKET_FILENAME.WASTE_LOAD_PICTURE_UPLOAD
      ) {
        await User.findOne({
          _id: UserId,
        }).orFail(() => new Error('User Not Found'));

        res({
          message: link,
          status: 200,
        });
      }
      res({
        message: 'Please check and verify all sent parameters',
        status: 500,
      });
    })
      .then(async data => {
        const SECRETS = await AwsSecrets.getInstance();

        const accessTokenSecret = SECRETS.JWT_ACCESS_TOKEN_SECRET;
        const decodedToken = jwt.verify(accessToken, accessTokenSecret) as unknown as AccessToken;
        const fileWaited = await file;
        const {filename, mimetype, encoding} = await fileWaited.file;

        await createApiLog({
          type: ApiLogTypes.MUTATION_END,
          level: ApiLogLevels.INFO,
          functionName: 'singleFileUpload',
          functionParams: [
            {paramName: 'uploadType', paramValue: uploadType, paramType: typeof uploadType},
            {paramName: 'documentId', paramValue: documentId, paramType: typeof documentId},
            {
              paramName: 'userId',
              paramValue: decodedToken.UserId,
              paramType: typeof decodedToken.UserId,
            },
            {paramName: 'filename', paramValue: filename, paramType: typeof filename},
            {paramName: 'mimetype', paramValue: mimetype, paramType: typeof mimetype},
            {paramName: 'encoding', paramValue: encoding, paramType: typeof encoding},
          ],
          additionalMessage: 'Upload Successful',
          startLogId,
        });
        return {
          message: data.message,
          status: data.status,
        };
      })
      .catch(async err => {
        const SECRETS = await AwsSecrets.getInstance();
        if (err.name === 'JsonWebTokenError') {
          await createApiLog({
            type: ApiLogTypes.MUTATION_END,
            level: ApiLogLevels.ERROR,
            functionName: 'singleFileUpload',
            functionParams: [
              {paramName: 'uploadType', paramValue: uploadType, paramType: typeof uploadType},
              {paramName: 'documentId', paramValue: documentId, paramType: typeof documentId},
            ],
            additionalMessage: 'Invalid Permissions: Invalid JWT Token',
            startLogId,
          });

          return {
            message: 'Not Authenticated',
            status: 401,
          };
        }

        const accessTokenSecret = SECRETS.JWT_ACCESS_TOKEN_SECRET;
        const decodedToken = jwt.verify(accessToken, accessTokenSecret) as unknown as AccessToken;
        const fileWaited = await file;
        const {filename, mimetype, encoding} = await fileWaited.file;

        if (err.name === 'PayloadTooLargeError') {
          await createApiLog({
            type: ApiLogTypes.MUTATION_END,
            level: ApiLogLevels.ERROR,
            functionName: 'singleFileUpload',
            functionParams: [
              {paramName: 'uploadType', paramValue: uploadType, paramType: typeof uploadType},
              {paramName: 'documentId', paramValue: documentId, paramType: typeof documentId},
              {
                paramName: 'userId',
                paramValue: decodedToken.UserId,
                paramType: typeof decodedToken.UserId,
              },
              {paramName: 'filename', paramValue: filename, paramType: typeof filename},
              {paramName: 'mimetype', paramValue: mimetype, paramType: typeof mimetype},
              {paramName: 'encoding', paramValue: encoding, paramType: typeof encoding},
            ],
            additionalMessage: 'File Size Exceeds Limit',
            startLogId,
          });

          return {
            message: 'File Size Exceeds Limit',
            status: 400,
          };
        }

        await createApiLog({
          type: ApiLogTypes.MUTATION_END,
          level: ApiLogLevels.ERROR,
          functionName: 'singleFileUpload',
          functionParams: [
            {paramName: 'uploadType', paramValue: uploadType, paramType: typeof uploadType},
            {paramName: 'documentId', paramValue: documentId, paramType: typeof documentId},
            {
              paramName: 'userId',
              paramValue: decodedToken.UserId,
              paramType: typeof decodedToken.UserId,
            },
            {paramName: 'filename', paramValue: filename, paramType: typeof filename},
            {paramName: 'mimetype', paramValue: mimetype, paramType: typeof mimetype},
            {paramName: 'encoding', paramValue: encoding, paramType: typeof encoding},
          ],
          additionalMessage: err.message,
          startLogId,
        });

        return {
          message: 'Unknown Error',
          status: 500,
        };
      });

    return {
      message: resolverPromise.message,
      status: resolverPromise.status,
    };
  }

  private async createUploadStream(key: string): Promise<S3UploadStream> {
    const pass = new stream.PassThrough();
    return {
      writeStream: pass,
      promise: this.s3
        .upload({
          Bucket: '30mins-stage-images',
          Key: key,
          Body: pass,
        })
        .promise(),
    };
  }
}
