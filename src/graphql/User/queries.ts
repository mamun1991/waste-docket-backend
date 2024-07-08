import {gql} from 'apollo-server-express';

export const queries = gql`
  type UserDataResponse {
    response: Response
    userData: User
    subscription: subscription
  }
  type UsersDataResponse {
    response: Response
    totalCount: Int
    usersData: [getUserData]
  }
  type SubscribedStripeUsers {
    response: Response
    totalCount: Int
    data: [stripeCustomer]
  }

  type Query {
    """
    Returns the UserData Associated with the Token provided.
    Authorization Header Required: None
    """
    getUserById(token: String): UserDataResponse
    getUsers(usersInput: SearchInput): UsersDataResponse
    validateEmail(email: String): Response
    getSubscribedStripeUsers(
      token: String
      pageNumber: String
      pageSize: String
      starting_after: String
      paginationMode: String
    ): SubscribedStripeUsers
  }
`;
