import mongoose from 'mongoose';

const {Schema} = mongoose;

const appVersionSchema = new Schema(
  {
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    androidLatestVersion: String,
    isAndroidUpgradeMandatory: Boolean,
    iosLatestVersion: String,
    isIosUpgradeMandatory: Boolean,
    lastUpdatedBy: {type: Schema.Types.ObjectId, ref: 'User'},
  },
  {collection: 'appVersions', timestamps: true}
);

export default mongoose.model('AppVersion', appVersionSchema);
