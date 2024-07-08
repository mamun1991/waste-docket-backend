import mongoose from 'mongoose';

const {Schema} = mongoose;

const docketData = new Schema({
  individualDocketNumber: {type: String},
  jobId: {type: String},
  prefix: {type: String},
  docketNumber: {type: String},
  gpsOn: {type: Boolean},
  longitude: {type: String},
  latitude: {type: String},
  date: {type: String},
  time: {type: String},
  vehicleRegistration: {type: String},
  isWaste: {type: Boolean},
  generalPickupDescription: {type: String},
  nonWasteLoadPictures: [{ type: String }],
  wastes: [
    {
      wasteDescription: {type: String},
      wasteLoWCode: {type: String},
      isHazardous: {type: Boolean},
      localAuthorityOfOrigin: {type: String},
      wasteQuantity: {type: {unit: {type: String}, amount: {type: Number}}},
      wasteLoadPicture: {type: String},
    },
  ],
  collectedFromWasteFacility: {
    type: Boolean,
  },
  collectionPointName: {type: String},
  collectionPointAddress: {type: String},
  collectionPointStreet: {type: String},
  collectionPointCity: {type: String},
  collectionPointCounty: {type: String},
  collectionPointEircode: {type: String},
  collectionPointCountry: {type: String},
  driverSignature: {type: String},
  customerSignature: {type: String},
  wasteFacilityRepSignature: {type: String},
  isLoadForExport: {type: Boolean},
  portOfExport: {type: String},
  countryOfDestination: {type: String},
  facilityAtDestination: {type: String},
  tfsReferenceNumber: {type: String},
  additionalInformation: {type: String},
});

const docketSchema = new Schema(
  {
    fleet: {type: Schema.Types.ObjectId, ref: 'Fleet'},
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    customerContact: {type: Schema.Types.ObjectId, ref: 'CustomerContact'},
    destinationFacility: {type: Schema.Types.ObjectId, ref: 'DestinationFacility'},
    creatorEmail: {type: String, required: true},
    fleetOwnerEmail: {type: String, required: false},
    docketData: docketData,
  },
  {collection: 'docket', timestamps: true}
);

export default mongoose.model('Docket', docketSchema);
