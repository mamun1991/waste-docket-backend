const fieldsToEncrypt = {
  User: [
    'personalDetails.name',
    'personalDetails.phone',
    'personalDetails.email',
    'personalDetails.address',
    'personalDetails.description',
  ],
  PendingOTP: ['email', 'phone', 'name'],
  Operator: ['name', 'address', 'contactName', 'contactEmail', 'contactPhone'],
  Site: ['name', 'address', 'contactName', 'contactEmail', 'contactPhone'],
};
export default fieldsToEncrypt;
