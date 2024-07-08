import twilio from 'twilio';
import AwsSecrets from './getAwsSecrets';

export default async function sendSms(textBody, sendToNumber) {
  const ENV_VALUES = await AwsSecrets.getInstance();
  const accountSid = ENV_VALUES.TWILIO_SID;
  const authToken = ENV_VALUES.TWILIO_AUTH_TOKEN;
  const twilioNumber = ENV_VALUES.TWILIO_PHONE_NUMBER;
  const client = twilio(accountSid, authToken);

  await client.messages.create({
    body: textBody,
    from: twilioNumber,
    to: sendToNumber,
  });
}
