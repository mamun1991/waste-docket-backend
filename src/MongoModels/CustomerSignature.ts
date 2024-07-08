import mongoose from 'mongoose';

const {Schema} = mongoose;

const customerSignatureSchema = new Schema(
  {
    fleet: {type: Schema.Types.ObjectId, ref: 'Fleet'},
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    signatureUrl: String,
    expireAt: {
      type: Date,
      default: Date.now,
      expires: 600, // Expire Document 10min from Creation
    },
  },
  {collection: 'customerSignatures', timestamps: true}
);

export default mongoose.model('CustomerSignature', customerSignatureSchema);
