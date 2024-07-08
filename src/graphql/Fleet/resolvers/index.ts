import getFleets from './queries/getFleets';
import getPendingInvitations from './queries/getPendingInvitations';
import getPendingInvitationsByEmail from './queries/getPendingInvitationsByEmail';
import getFleetById from './queries/getFleetById';
import getFleetMembersByIdWithSorting from './queries/getFleetMembersByIdWithSorting';
import getCustomerContactByFleetId from './queries/getCustomerContactByFleetId';
import getCustomerContactsByFleetIdWithSorting from './queries/getCustomerContactsByFleetIdWithSorting';
import getDocketsByFleetId from './queries/getDocketsByFleetId';
import getDocketsByFleetIdWithSorting from './queries/getDocketsByFleetIdWithSorting';
import getAllDocketsByFleetId from './queries/getAllDocketsByFleetId';
import getAllDocketsByFleetIdWithSorting from './queries/getAllDocketsByFleetIdWithSorting';
import getAllFleetsForAdmin from './queries/getAllFleetsForAdmin';
import getAllBusinessesForAdminWithSorting from './queries/getAllBusinessesForAdminWithSorting';
import getAllDocketsForAdmin from './queries/getAllDocketsForAdmin';
import getAllDocketsForAdminWithSorting from './queries/getAllDocketsForAdminWithSorting';
import getMultipleCollectionsTotalCountsForAdmin from './queries/getMultipleCollectionsTotalCountsForAdmin';
import getAllUsersForAdmin from './queries/getAllUsersForAdmin';
import getAllUsersForAdminWithSorting from './queries/getAllUsersForAdminWithSorting';
import getTermsAndConditionsByFleetId from './queries/getFleetTermsAndConditions';
import getDocketById from './queries/getDocketById';
import getLastDocketForUser from './queries/getLastDocketForUser';

import addFleet from './mutations/addFleet';
import deleteFleet from './mutations/deleteFleet';
import updateFleet from './mutations/updateFleet';
import inviteUserInFleet from './mutations/inviteUserInFleet';
import invitationAction from './mutations/invitationAction';
import inviteActionByEmail from './mutations/inviteActionByEmail';
import removeUserInFleet from './mutations/removeUserInFleet';
import leaveFleet from './mutations/leaveFleet';
import addDocket from './mutations/addDocket';
import forwardDocket from './mutations/forwardDocket';
import uploadWasteFacilityRepSignature from './mutations/uploadWasteFacilityRepSignature';
import uploadDriverSignature from './mutations/uploadDriverSignature';
import uploadCustomerSignature from './mutations/UploadCustomerSignature';
import uploadPdfUrlChunk from './mutations/UploadPdfUrlChunk';
import changeSelectedFleet from './mutations/changeSelectedFleet';
import addIndividualAccount from './mutations/addIndividualAccount';
import deleteDocketById from './mutations/deleteDocketById';
import updateDocketById from './mutations/updateDocketById';
import updateDocketSignatures from './mutations/updateDocketSignatures';
import deleteFleetByAdmin from './mutations/deleteFleetByAdmin';
import deleteDocketByAdmin from './mutations/deleteDocketByAdmin';
import deleteCollectionsDataByAdmin from './mutations/deleteCollectionsDataByAdmin';
import addCustomerInFleet from './mutations/addCustomerInFleet';
import editCustomerInFleet from './mutations/editCustomerInFleet';
import deleteCustomerInFleet from './mutations/deleteCustomerInFleet';
import importCustomersInFleet from './mutations/importCustomersInFleet';
import getEnvironmentalReport from './queries/getEnvironmentalReport';
import deletePendingInvitation from './mutations/deletePendingInvitation';
import addFacilityInFleet from './mutations/addFacilityInFleet';
import editFacilityInFleet from './mutations/editFacilityInFleet';
import deleteFacilityInFleet from './mutations/deleteFacilityInFleet';
import getDestinationFacility from './queries/getDestinationFacility';
import getDestinationFacilityWithSorting from './queries/getDestinationFacilityWithSorting';
import uploadWastePermitDocument from './mutations/UploadWastePermitDocument';
import getWasteCollectionPermitDocument from './queries/getWasteCollectionPermitDocument';
import getWasteCollectionPermitDocumentWithSorting from './queries/getWasteCollectionPermitDocumentWithSorting';
import deleteWastePermitDocument from './mutations/deleteWastePermitDocument';
import getDocumentDownloadUrl from './queries/getDocumentDownloadUrl';

const queries = {
  getFleets,
  getPendingInvitations,
  getPendingInvitationsByEmail,
  getFleetById,
  getFleetMembersByIdWithSorting,
  getCustomerContactByFleetId,
  getCustomerContactsByFleetIdWithSorting,
  getDocketsByFleetId,
  getDocketsByFleetIdWithSorting,
  getAllDocketsByFleetId,
  getAllDocketsByFleetIdWithSorting,
  getAllFleetsForAdmin,
  getAllBusinessesForAdminWithSorting,
  getAllDocketsForAdmin,
  getAllDocketsForAdminWithSorting,
  getMultipleCollectionsTotalCountsForAdmin,
  getAllUsersForAdmin,
  getAllUsersForAdminWithSorting,
  getTermsAndConditionsByFleetId,
  getEnvironmentalReport,
  getDocketById,
  getLastDocketForUser,
  getDestinationFacility,
  getDestinationFacilityWithSorting,
  getWasteCollectionPermitDocument,
  getWasteCollectionPermitDocumentWithSorting,
  getDocumentDownloadUrl,
};

const mutations = {
  addFleet,
  deleteFleet,
  updateFleet,
  inviteUserInFleet,
  invitationAction,
  inviteActionByEmail,
  removeUserInFleet,
  leaveFleet,
  addDocket,
  forwardDocket,
  uploadWasteFacilityRepSignature,
  uploadDriverSignature,
  uploadCustomerSignature,
  uploadPdfUrlChunk,
  changeSelectedFleet,
  addIndividualAccount,
  deleteDocketById,
  updateDocketById,
  updateDocketSignatures,
  deleteFleetByAdmin,
  deleteDocketByAdmin,
  deleteCollectionsDataByAdmin,
  addCustomerInFleet,
  editCustomerInFleet,
  deleteCustomerInFleet,
  importCustomersInFleet,
  deletePendingInvitation,
  addFacilityInFleet,
  editFacilityInFleet,
  deleteFacilityInFleet,
  uploadWastePermitDocument,
  deleteWastePermitDocument,
};

export const resolvers = {queries, mutations};
