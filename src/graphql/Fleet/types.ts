import {gql} from 'apollo-server-express';

export const types = gql`
  type Fleet {
    _id: String
    isIndividual: Boolean
    name: String
    VAT: String
    permitNumber: String
    ownerEmail: String
    permitHolderName: String
    permitHolderAddress: String
    termsAndConditions:String
    permitHolderContactDetails: String
    permitHolderEmail: String
    permitHolderLogo: String
    prefix: String
    docketNumber: Int
    individualDocketNumber: String
    membersEmails: [String]
    invitations: [Invitation]
    allowedWaste: [AllowedWaste]
    createdAt: String
  }
  type AllowedWaste {
    label: String
    value: String
  }

  type Waste {
    wasteDescription: String
    wasteLoWCode: String
    isHazardous: Boolean
    localAuthorityOfOrigin: String
    wasteQuantity: DocketQuantity
    wasteLoadPicture:String
  }

  type Docket {
    customerName: String
    jobId:String
    customerAddress: String
    customerStreet: String
    customerCity: String
    customerCounty: String
    customerEircode: String
    customerCountry: String
    customerEmail: String
    customerId:String
    prefix: String
    docketNumber: Int
    individualDocketNumber: String
    gpsOn: Boolean
    longitude: String
    latitude: String
    date: String
    time: String
    vehicleRegistration: String
    generalPickupDescription: String
    nonWasteLoadPictures:[String]
    isWaste: Boolean
    wastes: [Waste]
    collectedFromWasteFacility: Boolean
    collectionPointName: String
    collectionPointAddress: String
    collectionPointStreet:String
    collectionPointCity:String
    collectionPointCounty:String
    collectionPointEircode: String
    collectionPointCountry:String
    destinationFacilityLatitude:String
    destinationFacilityLongitude:String
    destinationFacilityName: String
    destinationFacilityAuthorisationNumber: String
    destinationFacilityAddress: String
    destinationFacilityStreet: String
    destinationFacilityCity: String
    destinationFacilityCounty: String
    destinationFacilityEircode: String
    destinationFacilityCountry: String
    driverSignature: String
    wasteFacilityRepSignature: String
    customerSignature:String
    isCustomerSignatureId:Boolean
    isLoadForExport: Boolean
    portOfExport: String
    countryOfDestination: String
    facilityAtDestination: String
    tfsReferenceNumber: String
    additionalInformation: String
  }

  type DocketQuantity {
    unit: String
    amount: Float
  }
`;
