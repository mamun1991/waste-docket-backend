const SubscriptionPlanLimit = (plan: 'FREE' | 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE') => {
  switch (plan) {
    case 'FREE':
      return 'unlimited';
    case 'BASIC':
      return '1';
    case 'STANDARD':
      return '5';
    case 'PREMIUM':
      return '15';
    case 'ENTERPRISE':
      return 'unlimited';
    default:
      return '1';
  }
};

export default SubscriptionPlanLimit;
