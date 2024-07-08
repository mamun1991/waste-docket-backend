import crypto from 'crypto';
import _ from 'lodash';

export default function decrypt(encryptedData, secret) {
  try {
    const encryptedArray = encryptedData.split(':');

    const iv = encryptedArray[0];
    const encrypted = Buffer.from(encryptedArray[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', secret, iv);
    const decrypted = decipher.update(encrypted);
    const clearText = Buffer.concat([decrypted, decipher.final()]).toString();
    return clearText;
  } catch (err) {
    console.log('ERROR');
  }
}
