import mongoose from 'mongoose';

const {Schema} = mongoose;

const destinationFacilityData = new Schema({
  destinationFacilityName: {type: String},
  destinationFacilityAuthorisationNumber: {type: String},
  destinationFacilityAddress: {type: String},
  destinationFacilityStreet: {type: String},
  destinationFacilityCity: {type: String},
  destinationFacilityCounty: {type: String},
  destinationFacilityEircode: {type: String},
  destinationFacilityCountry: {type: String, default: 'Ireland'},
  destinationFacilityLatitude: {type: String},
  destinationFacilityLongitude: {type: String},
  destinationFacilityId: {type: String},
});

const destinationFacilitySchema = new Schema(
  {
    fleet: {type: Schema.Types.ObjectId, ref: 'Fleet'},
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    destinationFacilityData: destinationFacilityData,
  },
  {collection: 'destinationFacility', timestamps: true}
);

export default mongoose.model('DestinationFacility', destinationFacilitySchema);
