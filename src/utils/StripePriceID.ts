const StripePriceID = (plan: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE', ENV_VALUES: any) => {
  switch (plan) {
    case 'BASIC':
      return ENV_VALUES.STRIPE_MODE === 'production'
        ? 'price_1OyFJ1DT37JCixB8bEbUwlpz'
        : 'price_1OyFHzDT37JCixB8TJCigCJP';
    case 'STANDARD':
      return ENV_VALUES.STRIPE_MODE === 'production'
        ? 'price_1OyFJBDT37JCixB8mQ66hCZn'
        : 'price_1OyFIMDT37JCixB83h5BVpPp';
    case 'PREMIUM':
      return ENV_VALUES.STRIPE_MODE === 'production'
        ? 'price_1OyFIxDT37JCixB8s9Rneyjc'
        : 'price_1OyFIZDT37JCixB8zrHVBXDJ';
    case 'ENTERPRISE':
      return ENV_VALUES.STRIPE_MODE === 'production'
        ? 'price_1OyFIvDT37JCixB8xwRzIxdL'
        : 'price_1OyFInDT37JCixB8ZAlsWJMC';
    default:
      return ENV_VALUES.STRIPE_MODE === 'production'
        ? 'price_1OyFJ1DT37JCixB8bEbUwlpz'
        : 'price_1OyFHzDT37JCixB8TJCigCJP';
  }
};

export default StripePriceID;
