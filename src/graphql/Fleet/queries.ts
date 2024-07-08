import {gql} from 'apollo-server-express';

export const queries = gql`
  type FleetDataResponse {
    response: Response
    fleetData: Fleet
  }
  type FleetsDataResponse {
    selectedFleet: String
    response: Response
    fleetData: [Fleet]
    totalCount: Int
    UserPendingInvitations: [Invitation]
  }
  type AdminFleetsDataResponse {
    response: Response
    fleetData: [Fleet]
    totalCount: Int
  }

  type PendingInvitationResponse {
    response: Response
    invitations: [Invitation]
  }

  type GetFleetByIdResponse {
    response: Response
    fleetData: Fleet
    membersData: [User]
    membersCount: Int
    pendingFleetInvitations: [Invitation]
    pendingFleetInvitationsCount: Int
  }

  type CustomerContact {
    _id: String
    fleet: Fleet
    contactProvider: User
    fleetOwnerEmail: String
    contactProviderEmail: String
    customerName: String
    customerPhone: String
    customerAddress: String
    customerStreet: String
    customerCity: String
    customerCounty: String
    customerEircode: String
    customerCountry: String
    customerId: String
    customerEmail: String
    isAutomatedGenerated: Boolean
  }

  type DestinationFacility {
    _id: String
    fleet: Fleet
    user: User
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

  type DestinationFacilityResponse {
    response: Response
    totalCount: Int
    destinationFacilityData: [DestinationFacility]
  }

  type CustomerContactResponse {
    response: Response
    customerContacts: [CustomerContact]
  }

  type SingleCustomerContactResponse {
    response: Response
    customerContact: CustomerContact
  }

  type SingleDestinationFacilityResponse {
    response: Response
    destinationFacilities: DestinationFacility
  }

  type WasteCollectionPermitDocumentResponse {
    _id: String
    fleet: Fleet
    user: User
    documentName: String
    createdAt: String
  }

  type WasteCollectionPermitDocumentsResponse {
    response: Response
    totalCount: Int
    wasteCollectionPermitDocument: [WasteCollectionPermitDocumentResponse]
    fleet: Fleet
  }

  type DocketWithoutCustomerContactDetails {
    individualDocketNumber: String
    docketNumber: Int
    jobId: String
    prefix: String
    gpsOn: Boolean
    longitude: String
    latitude: String
    date: String
    time: String
    vehicleRegistration: String
    generalPickupDescription: String
    nonWasteLoadPictures: [String]
    isWaste: Boolean
    wastes: [Waste]
    collectedFromWasteFacility: Boolean
    collectionPointName: String
    collectionPointAddress: String
    collectionPointStreet: String
    collectionPointCity: String
    collectionPointCounty: String
    collectionPointEircode: String
    collectionPointCountry: String
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
    wasteFacilityRepSignature: String
    isCustomerSignatureId: Boolean
    customerSignature: String
    isLoadForExport: Boolean
    portOfExport: String
    countryOfDestination: String
    facilityAtDestination: String
    tfsReferenceNumber: String
    additionalInformation: String
  }

  type DocketDataResponse {
    _id: String
    fleet: String
    user: User
    creatorEmail: String
    fleetOwnerEmail: String
    docketData: DocketResponse
    customerContact: CustomerContact
    destinationFacility: DestinationFacilityForDocket
  }

  type DocketResponse {
    individualDocketNumber: String
    docketNumber: Int
    jobId: String
    prefix: String
    gpsOn: Boolean
    longitude: String
    latitude: String
    date: String
    time: String
    vehicleRegistration: String
    generalPickupDescription: String
    nonWasteLoadPictures: [String]
    isWaste: Boolean
    wastes: [Waste]
    collectedFromWasteFacility: Boolean
    collectionPointName: String
    collectionPointAddress: String
    collectionPointStreet: String
    collectionPointCity: String
    collectionPointCounty: String
    collectionPointEircode: String
    collectionPointCountry: String
    driverSignature: String
    wasteFacilityRepSignature: String
    customerSignature: String
    isCustomerSignatureId: Boolean
    isLoadForExport: Boolean
    portOfExport: String
    countryOfDestination: String
    facilityAtDestination: String
    tfsReferenceNumber: String
    additionalInformation: String
  }

  type DestinationFacilityForDocket {
    _id: String
    destinationFacilityData: DestinationFacility
  }

  type DocketDataResponse2 {
    _id: String
    fleet: String
    user: User
    creatorEmail: String
    fleetOwnerEmail: String
    docketData: DocketResponse
    customerContact: CustomerContact
    destinationFacility: DestinationFacilityForDocket
    createdAt: String
  }

  type GetDocketsByFleetIdResponse {
    response: Response
    docketData: [DocketDataResponse2]
    totalCount: String
    fleet: Fleet
  }

  type DocketDataForAdminResponse {
    _id: String
    fleet: Fleet
    user: User
    creatorEmail: String
    fleetOwnerEmail: String
    docketData: DocketResponse
    customerContact: CustomerContact
    destinationFacility: DestinationFacilityForDocket
  }

  type GetDocketsForAdminResponse {
    response: Response
    docketData: [DocketDataForAdminResponse]
    totalCount: String
  }

  type EnvironmentalReportTab1Response {
    wasteLoWCode: String
    localAuthorityOfOrigin: String
    quantity: String
    goingToFacility: String
  }

  type EnvironmentalReportTab2Response {
    wasteLoWCode: String
    localAuthorityOfOrigin: String
    quantity: String
    goingToFacility: String
    collectedFromFacility: String
  }

  type EnvironmentalReportTab3Response {
    wasteLoWCode: String
    localAuthorityOfOrigin: String
    quantity: String
    goingToFacility: String
  }

  type GetEnvironmentalReportResponse {
    response: Response
    tab1Data: [EnvironmentalReportTab1Response]
    tab2Data: [EnvironmentalReportTab2Response]
    tab3Data: [EnvironmentalReportTab3Response]
  }

  input GeneralSearchParams {
    searchText: String
    pageNumber: Int
    resultsPerPage: Int
    startDate: String
    endDate: String
  }

  input MemberInputParams {
    memberSortColumn: String
    membersSortOrder: String
    membersPageNumber: Int
    membersItemsPerPage: Int
    pendingMembersSortColumn: String
    pendingMembersSortOrder: String
    pendingMembersPageNumber: Int
    pendingMembersItemsPerPage: Int
    doGetMembers: Boolean
  }

  input GeneralSearchParamsWithSorting {
    searchText: String
    pageNumber: Int
    sortColumn: String
    sortOrder: String
    resultsPerPage: Int
    startDate: String
    endDate: String
  }

  type GetUsersResponse {
    response: Response
    userData: [User]
    totalCount: String
  }

  type GetMultipleCollectionsTotalCountsResponse {
    customersCount: Int
    destinationFacilitiesCount: Int
    wastePermitDocumentsCount: Int
    invitesCount: Int
    subscriptions: Int
    response: Response
  }

  type CustomersDataResponse {
    response: Response
    customersData: [CustomerContact]
    totalCount: Int
  }

  type FleetQueryResponse {
    fleet: Fleet
    response: Response
  }

  type GetDocketByIdResponse {
    response: Response
    docketData: DocketDataResponse2
  }

  type DocumentDownloadUrlResponse {
    documentUrl: String
    response: Response
  }

  type Query {
    getFleets(fleetsInput: SearchInput): FleetsDataResponse
    getPendingInvitations: PendingInvitationResponse
    getPendingInvitationsByEmail(driverEmail: String): PendingInvitationResponse
    getFleetById(fleetId: String!, pageNumber: Int, resultsPerPage: Int): GetFleetByIdResponse

    getFleetMembersByIdWithSorting(
      fleetId: String!
      memberInputParams: MemberInputParams
    ): GetFleetByIdResponse

    getCustomerContactByFleetId(fleetId: String, customersInput: SearchInput): CustomersDataResponse
    getCustomerContactsByFleetIdWithSorting(
      fleetId: String
      customersInput: SearchInputWithSorting
    ): CustomersDataResponse
    getDocketsByFleetId(
      fleetId: String!
      searchParams: GeneralSearchParams
    ): GetDocketsByFleetIdResponse
    getDocketsByFleetIdWithSorting(
      fleetId: String!
      searchParams: GeneralSearchParamsWithSorting
    ): GetDocketsByFleetIdResponse
    getAllDocketsByFleetId(
      fleetId: String!
      searchParams: GeneralSearchParams
    ): GetDocketsByFleetIdResponse
    getAllDocketsByFleetIdWithSorting(
      fleetId: String!
      searchParams: GeneralSearchParamsWithSorting
    ): GetDocketsByFleetIdResponse
    getAllFleetsForAdmin(fleetsInput: SearchInput): AdminFleetsDataResponse
    getAllBusinessesForAdminWithSorting(
      fleetsInput: SearchInputWithSorting
    ): AdminFleetsDataResponse
    getAllDocketsForAdmin(searchParams: GeneralSearchParams): GetDocketsForAdminResponse
    getAllDocketsForAdminWithSorting(
      searchParams: GeneralSearchParamsWithSorting
    ): GetDocketsForAdminResponse
    getAllUsersForAdmin(searchParams: GeneralSearchParams): GetUsersResponse
    getAllUsersForAdminWithSorting(searchParams: GeneralSearchParamsWithSorting): GetUsersResponse
    getMultipleCollectionsTotalCountsForAdmin: GetMultipleCollectionsTotalCountsResponse
    getTermsAndConditionsByFleetId(fleetId: String!): FleetQueryResponse
    getEnvironmentalReport(
      fleetId: String!
      searchParams: GeneralSearchParams
    ): GetEnvironmentalReportResponse
    getDocketById(docketId: String!): GetDocketByIdResponse
    getLastDocketForUser: GetDocketByIdResponse
    getDestinationFacility(
      fleetId: String!
      facilityInput: SearchInput
    ): DestinationFacilityResponse
    getDestinationFacilityWithSorting(
      fleetId: String!
      facilityInput: SearchInputWithSorting
    ): DestinationFacilityResponse
    getWasteCollectionPermitDocumentWithSorting(
      wastePermitDocumentWithSortingInput: SearchInputWithSorting
    ): WasteCollectionPermitDocumentsResponse
    getWasteCollectionPermitDocument(
      fleetId: String!
      wastePermitDocumentInput: SearchInput
    ): WasteCollectionPermitDocumentsResponse

    getDocumentDownloadUrl(
      fleetId: String!
      wastePermitDocumentId: String!
    ): DocumentDownloadUrlResponse
  }
`;
