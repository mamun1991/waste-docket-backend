import {gql} from 'apollo-server-express';

export const mutations = gql`
  input FleetInput {
    name: String
    VAT: String
    permitHolderName: String
    permitNumber: String
    permitHolderAddress: String
    termsAndConditions: String
    permitHolderContactDetails: String
    permitHolderLogo: String
    permitHolderEmail: String
    prefix: String
    docketNumber: Int
    individualDocketNumber: String
    allowedWaste: [AllowedWasteInput]
  }

  input AllowedWasteInput {
    label: String
    value: String
  }

  input fleetInvitationInput {
    fleetId: String
    email: String
  }

  enum INVITATION_STATUS {
    ACCEPTED
    REJECTED
  }

  input DocketInput {
    customerName: String
    customerPhone: String
    jobId: String
    customerEmail: String
    customerAddress: String
    customerStreet: String
    customerCity: String
    customerCounty: String
    customerEircode: String
    customerCountry: String
    customerId: String
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
    nonWasteLoadPictures: [String]
    isWaste: Boolean
    wastes: [WasteInput]
    collectedFromWasteFacility: Boolean
    collectionPointName: String
    collectionPointAddress: String
    collectionPointStreet: String
    collectionPointCity: String
    collectionPointCounty: String
    collectionPointEircode: String
    collectionPointCountry: String
    destinationFacilityId: String
    destinationFacilityLatitude: String
    destinationFacilityLongitude: String
    destinationFacilityName: String
    destinationFacilityAuthorisationNumber: String
    destinationFacilityAddress: String
    destinationFacilityStreet: String
    destinationFacilityCity: String
    destinationFacilityCounty: String
    destinationFacilityEircode: String
    destinationFacilityCountry: String
    driverSignature: String
    isDriverSignatureId: Boolean
    wasteFacilityRepSignature: String
    isWasteFacilityRepSignatureId: Boolean
    customerSignature: String
    isCustomerSignatureId: Boolean
    isLoadForExport: Boolean
    portOfExport: String
    countryOfDestination: String
    facilityAtDestination: String
    tfsReferenceNumber: String
    additionalInformation: String
    doSendEmail: String
    pdfBase64Url: String
    isMobileApp: Boolean
  }

  input uploadWasteFacilityRepSignatureInput {
    fleet: String
    signatureChunk: String
    signatureId: String
  }

  input uploadDriverSignatureInput {
    fleet: String
    signatureChunk: String
    signatureId: String
  }

  input uploadCustomerSignatureInput {
    fleet: String
    signatureChunk: String
    signatureId: String
  }

  input uploadPdfUrlChunkInput {
    customerEmail: String
    pdfChunk: String
    pdfId: String
  }

  input DocketQuantityInput {
    unit: String
    amount: Float
  }

  input WasteInput {
    wasteDescription: String
    wasteLoWCode: String
    isHazardous: Boolean
    localAuthorityOfOrigin: String
    wasteQuantity: DocketQuantityInput
    wasteLoadPicture: String
  }

  type addDocketResponse {
    response: Response
  }

  type forwardDocketResponse {
    response: Response
  }

  type uploadWasteFacilityRepSignatureResponse {
    _id: String
    response: Response
  }

  type uploadDriverSignatureResponse {
    _id: String
    response: Response
  }

  type uploadCustomerSignatureResponse {
    _id: String
    response: Response
  }

  type uploadPdfUrlChunkResponse {
    _id: String
    response: Response
  }

  input CustomerContactInput {
    customerName: String
    customerPhone: String
    customerEmail: String
    customerAddress: String
    customerStreet: String
    customerCity: String
    customerCounty: String
    customerEircode: String
    customerCountry: String
    customerId: String
  }

  input DestinationFacilityInput {
    destinationFacilityName: String
    destinationFacilityAuthorisationNumber: String
    destinationFacilityAddress: String
    destinationFacilityStreet: String
    destinationFacilityCity: String
    destinationFacilityCounty: String
    destinationFacilityEircode: String
    destinationFacilityCountry: String
    destinationFacilityLatitude: String
    destinationFacilityLongitude: String
    destinationFacilityId: String
  }

  type NestedResponse {
    response: Response
  }

  scalar Upload

  type uploadWasterPermitDocumentResponse {
    response: Response
  }

  type Mutation {
    addFleet(fleetData: FleetInput): FleetDataResponse
    deleteFleet(fleetId: String): Response
    updateFleet(fleetData: FleetInput, fleetId: String): FleetDataResponse
    inviteUserInFleet(fleetInvitationData: fleetInvitationInput): Response
    invitationAction(
      fleetId: String
      action: INVITATION_STATUS
      dontChangeSelectedFleet: Boolean
    ): Response
    inviteActionByEmail(
      driverEmail: String
      fleetId: String
      action: INVITATION_STATUS
      dontChangeSelectedFleet: Boolean
    ): Response
    removeUserInFleet(fleetId: String, email: String): Response
    leaveFleet(fleetId: String!): Response
    addDocket(docketData: DocketInput!, fleetId: String!): addDocketResponse
    forwardDocket(email: String!, fleetId: String!, docketId: String!): Response
    uploadWasteFacilityRepSignature(
      signatureData: uploadWasteFacilityRepSignatureInput!
    ): uploadWasteFacilityRepSignatureResponse
    uploadDriverSignature(signatureData: uploadDriverSignatureInput!): uploadDriverSignatureResponse
    uploadCustomerSignature(
      signatureData: uploadCustomerSignatureInput!
    ): uploadCustomerSignatureResponse
    uploadPdfUrlChunk(pdfData: uploadPdfUrlChunkInput!): uploadPdfUrlChunkResponse
    changeSelectedFleet(fleetId: String!): Response
    addIndividualAccount(permitNumber: String!): Response
    deleteDocketById(fleetId: String!, docketId: String!): Response
    deletePendingInvitation(invitationId: String!): Response
    updateDocketById(docketData: DocketInput!, fleetId: String!, docketId: String!): Response
    updateDocketSignatures(docketData: DocketInput!, fleetId: String!, docketId: String!): Response
    deleteFleetByAdmin(fleetId: String): Response
    deleteDocketByAdmin(docketId: String): Response
    deleteCollectionsDataByAdmin(collection: String!): Response
    addCustomerInFleet(
      fleetId: String!
      customerData: CustomerContactInput!
    ): SingleCustomerContactResponse
    editCustomerInFleet(
      customerId: String!
      fleetId: String!
      customerData: CustomerContactInput!
    ): SingleCustomerContactResponse
    deleteCustomerInFleet(customerId: String!, fleetId: String!): NestedResponse
    importCustomersInFleet(fleetId: String!, file: Upload!): NestedResponse
    addFacilityInFleet(
      fleetId: String!
      facilityData: DestinationFacilityInput!
    ): SingleDestinationFacilityResponse
    editFacilityInFleet(
      fleetId: String!
      facilityId: String!
      facilityData: DestinationFacilityInput!
    ): SingleDestinationFacilityResponse
    deleteFacilityInFleet(facilityId: String!, fleetId: String!): NestedResponse
    uploadWastePermitDocument(
      fleetId: String!
      documentData: Upload!
    ): uploadWasterPermitDocumentResponse
    deleteWastePermitDocument(
      fleetId: String!
      wasteCollectionPermitDocumentId: String!
    ): NestedResponse
  }
`;
