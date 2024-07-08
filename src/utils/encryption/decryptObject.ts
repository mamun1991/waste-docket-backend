import _ from 'lodash';
import decrypt from './decrypt';
import mongoose from 'mongoose';
import AwsSecrets from '../getAwsSecrets';

export default async function decryptObject(obj: any) {
  try {
    const ENV_VALUES = await AwsSecrets.getInstance();

    // Will only work with a Mongoose Object (.toObject transforms the object into a raw object without Mongoose Methods)
    const objectToDecrypt = obj instanceof mongoose.Document ? obj.toObject() : obj;

    const decryptCurrent = currObj => {
      _.forOwn(currObj, (val, key) => {
        if (_.isArray(val)) {
          return;
        } else if (_.isObject(val)) {
          decryptCurrent(val);
        } else {
          if (key.split('_')[2] === 'enc' && val) {
            const keyToDecrypt = key.replace('__enc_', '');
            const valueToDecrypt = _.get(currObj, keyToDecrypt);
            const decryptedValue = decrypt(valueToDecrypt, ENV_VALUES.ENCRYPTION_SECRET);
            _.set(currObj, keyToDecrypt, decryptedValue);
            _.unset(currObj, key);
          }
        }
      });
    };

    decryptCurrent(objectToDecrypt);

    return objectToDecrypt;
  } catch (err) {
    throw err;
  }
}
