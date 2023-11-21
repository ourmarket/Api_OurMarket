const { validationResult } = require('express-validator');
const { logger } = require('../helpers/logger');

const validateFields = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		logger.error(errors.mapped());
		return res.status(400).json(errors.mapped());
	}

	next();
};

module.exports = {
	validateFields,
};
