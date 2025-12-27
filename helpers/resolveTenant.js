const clientCategory = require('../models/clientCategory');
const { isLocal } = require('./env');

const resolveTenant = (req) => {

  const match = req.auth.sessionClaims.azp
  const cleanUrl = match.split('//')[1]
  const tenantId = cleanUrl.split('.')[0]

  if (isLocal()) {
    return tenantId || null;
  }

  // producción → primer subdominio
  const host = req.hostname; // dr_01.dashboard.ourmarket.com
  return host.split('.')[0] || null;
};

module.exports = {
  resolveTenant,
};
