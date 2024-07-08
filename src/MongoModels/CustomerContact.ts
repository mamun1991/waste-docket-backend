import mongoose from 'mongoose';

const {Schema} = mongoose;

const customerContact = new Schema(
  {
    fleet: {type: Schema.Types.ObjectId, ref: 'Fleet'},
    contactProvider: {type: Schema.Types.ObjectId, ref: 'User'},
    fleetOwnerEmail: {type: String},
    contactProviderEmail: {type: String},
    customerName: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    customerPhone: {
      type: String,
    },
    customerAddress: {type: String},
    customerStreet: {type: String},
    customerCity: {type: String},
    customerCounty: {type: String},
    customerEircode: {type: String},
    customerCountry: {type: String},
    customerId: {type: String},
    customerEmail: {type: String, required: false, trim: true},
    isAutomatedGenerated: {type: Boolean},
  },
  {collection: 'CustomerContacts', timestamps: true}
);

export default mongoose.model('CustomerContact', customerContact);
