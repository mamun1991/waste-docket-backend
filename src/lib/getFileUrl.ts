import AWS from 'aws-sdk';
import {ILinkGenerator} from '../constants/types';
import AwsSecrets from '../utils/getAwsSecrets';

export class AWSS3Uploader implements ILinkGenerator {
  private s3: AWS.S3;

  constructor() {
    AWS.config = new AWS.Config();
    AWS.config.update({
      region: 'us-west-2',
      signatureVersion: 'v4',
      s3: {
        signatureVersion: 'v4',
      },
    });

    this.s3 = new AWS.S3();
  }

  async generateFileAccessLink(
    _,
    {fileUrl, fileType}: {fileUrl: string; fileType: string}
  ): Promise<string> {
    const SECRETS = await AwsSecrets.getInstance();
    const bucketName = SECRETS.AWS_S3_ASSETS;

    const segments = fileUrl.split('/');
    const fileName = segments[segments.length - 1];
    if (!fileName) {
      throw new Error('Invalid file URL provided.');
    }

    const getItemParams = {
      Bucket: bucketName,
      Key: fileName,
      Expires: 600,
    };

    if (fileName.endsWith('.pdf')) {
      getItemParams['ResponseContentType'] = 'application/pdf';
    } else if (fileType) {
      getItemParams['ResponseContentType'] = fileType;
    }

    // Directly return the promise from s3.getSignedUrlPromise
    return this.s3.getSignedUrlPromise('getObject', getItemParams);
  }
}
