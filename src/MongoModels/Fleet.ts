import mongoose from 'mongoose';

const {Schema} = mongoose;

const allowedWasteSchema = new Schema({
  label: {type: String, required: true},
  value: {type: String, required: true},
});

const fleetSchema = new Schema(
  {
    isIndividual: {type: Boolean, required: true},
    name: {type: String, required: true},
    VAT: {type: String, required: false},
    prefix: {type: String, required: false},
    docketNumber: {type: Number, required: false},
    individualDocketNumber: {type: String, required: false},
    permitHolderName: {type: String},
    permitNumber: {type: String},
    permitHolderAddress: {type: String},
    termsAndConditions: {type: String},
    permitHolderContactDetails: {type: String},
    permitHolderLogo: {type: String},
    permitHolderEmail: {type: String},
    ownerEmail: {type: String, required: true},
    membersEmails: [{type: String, required: false}],
    invitations: [{type: Schema.Types.ObjectId, ref: 'FleetInvitation'}],
    allowedWaste: [allowedWasteSchema],
  },
  {collection: 'fleets', timestamps: true}
);

export default mongoose.model('Fleet', fleetSchema);
