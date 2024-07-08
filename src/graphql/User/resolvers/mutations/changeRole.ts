import User from '../../../../MongoModels/User';

export default async function changeRole(_parent, {userId, role}) {
  try {
    await User.findByIdAndUpdate(userId, {
      accountType: role,
    });
    return {
      message: 'Role Changed',
      status: 200,
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return {
        message: 'Not Authenticated',
        status: 401,
      };
    }
    return {
      message: err.message,
      status: 500,
    };
  }
}
