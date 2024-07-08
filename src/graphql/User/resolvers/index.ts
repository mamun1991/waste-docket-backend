import getUserById from './queries/getUserById';
import getUsers from './queries/getUsers';
import validateEmail from './queries/validateEmail';
import getSubscribedStripeUsers from './queries/getSubscribedStripeUsers';

import generateSignInOtp from './mutations/generateSignInOtp';
import generateSignUpOtp from './mutations/generateSignUpOtp';
import validateOtp from './mutations/validateOtp';
import handleSignIn from './mutations/handleSignIn';
import completeSignUp from './completeSignUp';
import emailBypassOTP from './mutations/emailBypassOTP';
import deleteUserByAdmin from './mutations/deleteUserByAdmin';
import deleteMyAccount from './mutations/deleteMyAccount';
import changeRole from './mutations/changeRole';
import changeSubRole from './mutations/changeSubRole';
import updateSubRoleByUser from './mutations/updateSubRoleByUser';
import createSubscription from './mutations/createSubscription';
import cancelSubscription from './mutations/cancelSubscription';
import refundAndUnsubscribe from './mutations/refundAndUnsubscribe';
import deleteStripeCustomer from './mutations/deleteStripeCustomer';

const queries = {
  getUserById,
  getUsers,
  validateEmail,
  getSubscribedStripeUsers,
};

const mutations = {
  generateSignUpOtp,
  generateSignInOtp,
  validateOtp,
  handleSignIn,
  completeSignUp,
  emailBypassOTP,
  deleteUserByAdmin,
  deleteMyAccount,
  changeRole,
  changeSubRole,
  updateSubRoleByUser,
  createSubscription,
  cancelSubscription,
  refundAndUnsubscribe,
  deleteStripeCustomer,
};

export const resolvers = {queries, mutations};
