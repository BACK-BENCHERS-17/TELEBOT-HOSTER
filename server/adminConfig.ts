// Enforce required environment variables in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    throw new Error(
      'ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set in production. ' +
      'Please configure these in your Render dashboard before deployment.'
    );
  }
}

export const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'change-this-password'
};

export const DEVELOPER_CONTACT = process.env.DEVELOPER_CONTACT || 't.me/BACK_BENCHERS17';
