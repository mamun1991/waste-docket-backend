import {gql} from 'apollo-server-express';

export const types = gql`
  type User {
    _id: String
    personalDetails: PersonalDetails
    accountType: String
    isSignUpComplete: Boolean
    fleets: [Fleet]
    invitations: [Invitation]
    selectedFleet: Fleet
    accountSubType: String
    createdAt: Date
  }

  type Invitation {
    _id: String
    inviteeEmail: String
    fleetName: String
    status: String
    fleetId: Fleet
    userId: User
    createdAt: String
  }
  type getUserData {
    _id: String
    personalDetails: PersonalDetails
    accountType: String
  }
  type PersonalDetails {
    name: String
    email: String
  }

  type subscription {
    _id: String
    plan: String
    oldPlan: String
    status: String
    trialEndsAt: Date
    startAt: Date
    endsAt: Date
    stripeSubscriptionId: String
    stripeCustomerId: String
    stripeProductId: String
    stripePriceId: String
    createdAt: Date
    updatedAt: Date
    maxLimit: String
    limit: String
  }

  type stripeCustomer {
    customerId: String
    email: String
    default_payment_method: String
    name: String
    phone: String
    subscriptionId: String
    collection_method: String
    currency: String
    latest_invoice: String
    subscriptionStatus: String
    productName: String
    isSubscriptionCancelled: String
  }
`;
