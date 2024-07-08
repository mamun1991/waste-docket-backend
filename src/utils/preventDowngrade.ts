const preventDowngrade = (invitationCount: number, userSelectedPlan: string) => {
  if (invitationCount >= 16) {
    return "You can't cancel subscription, please delete invitations to cancel.";
  }
  if (invitationCount >= 1 && userSelectedPlan === 'BASIC') {
    return "You can't downgrade to BASIC, please delete invitations to downgrade.";
  }
  if (invitationCount >= 5 && userSelectedPlan === 'STANDARD') {
    return "You can't downgrade to STANDARD, please delete invitations to downgrade.";
  }
  if (invitationCount >= 15 && userSelectedPlan === 'PREMIUM') {
    return "You can't downgrade to PREMIUM, please delete invitations to downgrade.";
  }
};

export default preventDowngrade;
