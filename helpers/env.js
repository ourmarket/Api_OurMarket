const isLocal = () => process.env.APP_ENV === 'local';
const isProd = () => process.env.APP_ENV === 'production';

module.exports = {
  isLocal,
  isProd,
};
