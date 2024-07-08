const StripeProductIDs = (
  plan: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE',
  ENV_VALUES: any
) => {
  switch (plan) {
    case 'BASIC':
      return ENV_VALUES.STRIPE_MODE === 'production'
        ? 'prod_Pnr1nY7iIhpmFU'
        : 'prod_Pnqzndcx8VKjAk';
    case 'STANDARD':
      return ENV_VALUES.STRIPE_MODE === 'production'
        ? 'prod_Pnr1uHxq2SPy1X'
        : 'prod_Pnr0EWDXcl7jhr';
    case 'PREMIUM':
      return ENV_VALUES.STRIPE_MODE === 'production'
        ? 'prod_Pnr0p1KYrBWHod'
        : 'prod_Pnr0deCdCSDTN3';
    case 'ENTERPRISE':
      return ENV_VALUES.STRIPE_MODE === 'production'
        ? 'prod_Pnr0dpx3KRwpHc'
        : 'prod_Pnr0CeAaknyIbG';
    default:
      return ENV_VALUES.STRIPE_MODE === 'production'
        ? 'prod_Pnr1nY7iIhpmFU'
        : 'prod_Pnqzndcx8VKjAk';
  }
};

export default StripeProductIDs;
