const { check } = require('express-validator');
const { existBrandById } = require('../helpers');
const { validateFields } = require('../middlewares');
const { hasRole } = require('../middlewares/hasRole');

const getBrandValidation = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existBrandById),
	validateFields,
];
const postBrandValidation = [
	check('name', 'El nombre es obligatorio').not().isEmpty(),
	validateFields,
];

const putBrandValidation = [
	check('name', 'El nombre es obligatorio').not().isEmpty(),
	check('id').custom(existBrandById),
	validateFields,
];

const deleteBrandValidation = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existBrandById),
	validateFields,
];

module.exports = {
	getBrandValidation,
	postBrandValidation,
	putBrandValidation,
	deleteBrandValidation,
};
