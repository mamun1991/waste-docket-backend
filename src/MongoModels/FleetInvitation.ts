import mongoose from 'mongoose';

const {Schema} = mongoose;

const fleetInvitation = new Schema(
  {
    status: {type: String},
    inviteeEmail: {type: String},
    fleetName: {type: String},
    fleetId: {type: Schema.Types.ObjectId, ref: 'Fleet'},
    userId: {type: Schema.Types.ObjectId, ref: 'User'},
  },
  {collection: 'fleetInvitation', timestamps: true}
);

export default mongoose.model('FleetInvitation', fleetInvitation);
