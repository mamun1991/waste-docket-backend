import mongoose from 'mongoose';

const {Schema} = mongoose;

const apiLogSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    functionName: {
      type: String,
      required: true,
    },
    functionParams: [
      {
        paramName: {
          type: String,
        },
        paramValue: {
          type: String,
        },
        paramType: {
          type: String,
        },
      },
    ],
    additionalMessage: {
      type: String,
    },
    startLogId: String,
    createdAt: {
      type: String,
      default: Date.now,
    },
    expireAt: {
      type: Date,
      default: new Date(new Date().valueOf() + 1000 * 60 * 60 * 24 * 30), // 30-Days from Creation
      expires: 60, // Expire Document 60 Seconds After Date
    },
  },
  {collection: 'apiLogs'}
);

export default mongoose.model('ApiLog', apiLogSchema);
