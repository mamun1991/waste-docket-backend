const SubscriptionPrices = (plan: 'PLAN_1' | 'PLAN_2_5' | 'PLAN_6_15' | 'PLAN_16+') => {
  switch (plan) {
    case 'PLAN_1':
      return 89;
    case 'PLAN_2_5':
      return 149;
    case 'PLAN_6_15':
      return 199;
    case 'PLAN_16+':
      return 499;
    default:
      return 89; // Default (PLAN_1)
  }
};

export default SubscriptionPrices;
