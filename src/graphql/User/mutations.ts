import {gql} from 'apollo-server-express';

export const mutations = gql`
  enum AccountType {
    ADMIN
    USER
  }
  input UserInput {
    personalDetails: PersonalDetailsInput
    accountType: AccountType
    operatorId: String
  }
  input PersonalDetailsInput {
    email: String
    phone: String
    name: String
    description: String
  }
  input PersonalDetailsUpdateInput {
    phone: String
    name: String
    email: String
    description: String
  }
  input UserUpdateInput {
    personalDetails: PersonalDetailsUpdateInput
    accountType: AccountType
    operatorId: String
  }

  type ValidateOtpResponse {
    email: String
    token: String
    user: User
    response: Response
  }

  type CompleteSignUpResponse {
    response: Response
    pendingInvites: [String]
    fleets: [Fleet]
  }

  type Mutation {
    handleSignIn(email: String): Response
    generateSignInOtp(email: String): Response
    validateOtp(
      fullName: String
      email: String
      otpToken: String!
      accountSubType: String
    ): ValidateOtpResponse
    generateEmailChangeOtp(email: String!): Response
    generateSignUpOtp(fullName: String!, email: String!): Response
    completeSignUp(
      name: String
      VAT: String
      permitNumber: String
      isIndividual: Boolean
      isBusiness: Boolean
      permitHolderName: String
      permitHolderAddress: String
      permitHolderContactDetails: String
      prefix: String
    ): CompleteSignUpResponse
    emailBypassOTP(email: String): ValidateOtpResponse
    deleteUserByAdmin(userId: String): Response
    deleteMyAccount: Response
    changeRole(userId: String!, role: String!): Response
    changeSubRole(userId: String!, subRole: String!): Response
    updateSubRoleByUser(subRole: String!): Response
    createSubscription(
      paymentMethodId: String!
      plan: String!
      user: String!
      mode: String!
    ): Response
    cancelSubscription(subscriptionId: String!): Response
    refundAndUnsubscribe(
      latest_invoice: String!
      customerId: String!
      email: String!
      subscriptionId: String!
      productName: String!
    ): Response
    deleteStripeCustomer(
      latest_invoice: String!
      customerId: String!
      email: String!
      subscriptionId: String!
      productName: String!
    ): Response
  }
`;
