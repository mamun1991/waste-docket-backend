import mongoose from 'mongoose';

const {Schema} = mongoose;

const pendingOTPSchema = new Schema(
  {
    email: {type: String},

    fName: String,

    lName: String,

    phone: String,

    otpToken: {
      type: String,
      required: true,
    },
    password: String,
    expireAt: {
      type: Date,
      default: Date.now,
      expires: 600, // Expire Document 10min from Creation
    },
  },
  {collection: 'pendingOTPs'}
);

export default mongoose.model('PendingOTP', pendingOTPSchema);
