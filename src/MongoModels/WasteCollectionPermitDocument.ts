import mongoose from 'mongoose';

const {Schema} = mongoose;

const wasteCollectionPermitDocumentSchema = new Schema(
  {
    fleet: {type: Schema.Types.ObjectId, ref: 'Fleet'},
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    documentUrl: String,
    documentName: String,
  },
  {collection: 'wasteCollectionPermitDocuments', timestamps: true}
);

export default mongoose.model(
  'WasteCollectionPermitDocuments',
  wasteCollectionPermitDocumentSchema
);
