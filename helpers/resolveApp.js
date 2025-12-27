const { isLocal } = require('./env');

const resolveApp = (req) => {
  if (isLocal()) {
    const match = req.auth.sessionClaims.azp
    const cleanUrl = match.split('//')[1]
    const app = cleanUrl.split('.')[1]

    return app || null;
  }

  // producción → subdominio
  const host = req.hostname; // dr_01.dashboard.ourmarket.com
  return host.split('.')[1] || null;
};

module.exports = {
  resolveApp,
};
