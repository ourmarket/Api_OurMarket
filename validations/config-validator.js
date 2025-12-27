const { hasRole } = require('../middlewares/hasRole');

const getConfigValidation = [hasRole('ADMIN_ROLE')];
const putConfigValidation = [hasRole('ADMIN_ROLE')];

module.exports = {
	getConfigValidation,
	putConfigValidation,
};
