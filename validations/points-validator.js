const { check } = require('express-validator');
const { existClientById, existPointsById } = require('../helpers');
const { validateFields } = require('../middlewares');
const { hasRole } = require('../middlewares/hasRole');

const getAllPointsValidation = [hasRole('ADMIN_ROLE'), validateFields];
const getAllPointsByClientValidation = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existClientById),
	validateFields,
];

const postPointsValidation = [
	hasRole('ADMIN_ROLE'),
	check('clientId', 'No es un id de Mongo válido').isMongoId(),
	check('clientId').custom(existClientById),
	check('points', 'Los puntos son obligatorios').not().isEmpty(),
	check('action', 'La acción es obligatoria').not().isEmpty(),
	validateFields,
];

const putPointsValidation = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existPointsById),
	validateFields,
];

const deletePointsValidation = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existPointsById),
	validateFields,
];
const resetPointsValidation = [hasRole('ADMIN_ROLE'), validateFields];

module.exports = {
	getAllPointsValidation,
	getAllPointsByClientValidation,
	postPointsValidation,
	putPointsValidation,
	deletePointsValidation,
	resetPointsValidation,
};
