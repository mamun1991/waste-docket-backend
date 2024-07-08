export default function isUserMemberOfFleet(fleet, user) {
  const userEmail = user.personalDetails.email;
  const memberEmails = fleet.membersEmails;
  return memberEmails.includes(userEmail);
}
