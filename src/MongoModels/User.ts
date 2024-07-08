import mongoose from 'mongoose';
import {AccountSubTypes, AccountTypes} from '../constants/enums';

const {Schema} = mongoose;

const userSchema = new Schema(
  {
    personalDetails: {
      name: {type: String, required: true},
      email: {type: String, unique: true, required: true},
    },
    accountType: {
      type: String,
      enum: [AccountTypes.ADMIN, AccountTypes.USER],
      default: AccountTypes.USER,
    },
    accountSubType: {
      type: String,
      enum: [AccountSubTypes.BUSINESS_ADMIN, AccountSubTypes.DRIVER],
      default: null,
    },
    isSignUpComplete: {type: Boolean, default: false},
    selectedFleet: {type: Schema.Types.ObjectId, ref: 'Fleet', default: null},
    fleets: [{type: Schema.Types.ObjectId, ref: 'Fleet'}],
    invitations: [{type: Schema.Types.ObjectId, ref: 'FleetInvitation'}],
  },
  {collection: 'users', timestamps: true}
);

export default mongoose.model('User', userSchema);
