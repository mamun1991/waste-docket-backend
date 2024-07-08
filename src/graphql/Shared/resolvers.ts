import {AWSS3Uploader} from '../../lib/S3';
import deleteFileFromBucket from './deleteFileFromBucket';
import AwsSecrets from '../../utils/getAwsSecrets';
import getPoliciesURL from './getPoliciesURL';
import getEnvironmentVairables from './getEnvironmentVariables';

const s3Uploader = new AWSS3Uploader();

const queries = {
  getENV: async () => {
    const SECRETS = await AwsSecrets.getInstance();
    return SECRETS.Test;
  },
  getPoliciesURL: getPoliciesURL,
  getEnvironmentVairables: getEnvironmentVairables,
};
const mutations = {
  singleUpload: s3Uploader.singleFileUploadResolver.bind(s3Uploader),
  deleteFileFromBucket: deleteFileFromBucket,
};

export const resolvers = {queries, mutations};
