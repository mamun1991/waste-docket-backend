import _ from 'lodash';
import encrypt from './encrypt';
import decryptObject from './decryptObject';
import AwsSecrets from '../getAwsSecrets';

export default async function encryptObject(existingObj, updateData, fieldsToEncrypt) {
  try {
    const ENV_VALUES = await AwsSecrets.getInstance();

    const mergeCustomizer = (objValue, srcValue) => {
      if (_.isArray(objValue)) {
        return srcValue;
      }
    };

    const decryptedObject = await decryptObject(existingObj);
    const mergedObject = _.merge(decryptedObject, updateData, mergeCustomizer);

    for (const field of fieldsToEncrypt) {
      const data = _.get(mergedObject, field);
      if (data) {
        const encryptedValue = await encrypt(
          data,
          ENV_VALUES.ENCRYPTION_SECRET,
          ENV_VALUES.ENCRYPTION_SALT
        );
        const encryptedFieldKey = `__enc_${_.takeRight(field.split('.'))[0]}`;
        const encrypedFieldPathStart = _.dropRight(field.split('.'));
        encrypedFieldPathStart.push(encryptedFieldKey);
        const finalEncryptedFieldPath = encrypedFieldPathStart.join('.');

        _.set(mergedObject, field, encryptedValue);
        _.set(mergedObject, finalEncryptedFieldPath, true);
      }
    }

    _.set(mergedObject, '__v_enc', 1);

    return mergedObject;
  } catch (err) {
    throw err;
  }
}
