import mongoose from 'mongoose';

const {Schema} = mongoose;

const subscriptionSchema = new Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true}, // Link to the User model
  oldPlan: {
    type: String,
    enum: ['FREE', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE', null],
    default: null,
  },
  plan: {
    type: String,
    enum: ['FREE', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'],
    default: 'FREE',
  },
  status: {
    type: String,
    enum: ['trialing', 'active', 'cancelled', 'past_due', 'unpaid'],
    default: 'trialing',
  },
  trialEndsAt: {type: Date}, // Store the trial end date for reference
  startAt: {type: Date, default: null}, // Store the trial end date for reference
  endsAt: {type: Date, default: null}, // Store the trial end date for reference
  stripeSubscriptionId: {type: String, default: null},
  stripeCustomerId: {type: String, default: null},
  stripeProductId: {type: String, default: null},
  stripePriceId: {type: String, default: null},
  createdAt: {type: Date, default: Date.now()},
  updatedAt: {type: Date, default: null},
});

export default mongoose.model('Subscription', subscriptionSchema);
