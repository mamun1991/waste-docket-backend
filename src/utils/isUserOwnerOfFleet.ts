export default function isUserOwnerOfFleet(fleet, user) {
  const userEmail = user.personalDetails.email;
  const {ownerEmail} = fleet;
  return ownerEmail === userEmail;
}
