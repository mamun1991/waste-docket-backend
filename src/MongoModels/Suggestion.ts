import mongoose from 'mongoose';

const {Schema} = mongoose;

const suggestionSchema = new Schema(
  {
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    fleet: {type: Schema.Types.ObjectId, ref: 'Fleet'},
    fleetName: String,
    fleetOwnerEmail: String,
    name: String,
    email: String,
    suggestion: String,
  },
  {collection: 'suggestion', timestamps: true}
);

export default mongoose.model('Suggestion', suggestionSchema);
