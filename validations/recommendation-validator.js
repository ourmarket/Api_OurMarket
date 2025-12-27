const { check } = require('express-validator');
const {
	existClientById,
	existPointsById,
	existUserById,
} = require('../helpers');
const { validateFields } = require('../middlewares');
const { hasRole } = require('../middlewares/hasRole');

const getAllRecommendationValidation = [hasRole('ADMIN_ROLE'), validateFields];
const getAllRecommendationByClientValidation = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existClientById),
	validateFields,
];
const postRecommendationValidation = [
	hasRole('ADMIN_ROLE'),
	check('clientId', 'No es un id de Mongo válido').isMongoId(),
	check('clientId').custom(existClientById),

	check('recommendedClient', 'No es un id de Mongo válido').isMongoId(),
	check('recommendedClient').custom(existClientById),

	check('recommendedUser', 'No es un id de Mongo válido').isMongoId(),
	check('recommendedUser').custom(existUserById),

	validateFields,
];

const putRecommendationValidation = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existPointsById),
	validateFields,
];

const deleteRecommendationValidation = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existPointsById),
	validateFields,
];

module.exports = {
	getAllRecommendationValidation,
	getAllRecommendationByClientValidation,
	postRecommendationValidation,
	putRecommendationValidation,
	deleteRecommendationValidation,
};
