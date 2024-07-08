import AWS from 'aws-sdk';

const AwsSecrets = (() => {
  let instance;

  const createInstance = () => {
    const secretManager = new AWS.SecretsManager({region: 'us-west-2'});
    const secretId =
      process.env.NODE_ENV === 'production' ? 'waste-docket-production' : 'waste-docket-stage';
    const secrets = new Promise<any>((resolve, reject) => {
      // retrieving secrets from secrets manager
      secretManager.getSecretValue({SecretId: secretId}, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(data.SecretString));
        }
      });
    });
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('secretId:', secretId);
    return secrets;
  };

  return {
    getInstance: async () => {
      if (!instance) {
        instance = await createInstance();
      }
      return instance;
    },
  };
})();

export default AwsSecrets;
