export default function isUserOwnerOrMemberOfFleet(fleet, user) {
  const userEmail = user.personalDetails.email;
  const {ownerEmail} = fleet;
  const memberEmails = fleet.membersEmails;
  return ownerEmail === userEmail || memberEmails.includes(userEmail);
}
