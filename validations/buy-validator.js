const { validateFields, validarJWT, isAdminRole } = require('../middlewares');
const { check } = require('express-validator');
const { existBuyById } = require('../helpers');

const getBuysValidator = [validarJWT, validateFields];
const getBuyValidator = [
	validarJWT,
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existBuyById),
	validateFields,
];
const postBuyValidator = [
	validarJWT,
	check('supplier', 'No es un id de Mongo válido').isMongoId(),
	check('quantityProducts', 'quantityProducts es obligatoria').not().isEmpty(),
	check('total', 'total es obligatoria').not().isEmpty(),
	check('payment', 'payment es obligatoria').not().isEmpty(),
	check('products', 'products es obligatoria').not().isEmpty(),
	validateFields,
];
const putBuyValidator = [
	validarJWT,
	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existBuyById),
	validateFields,
];
const deleteBuyValidator = [
	validarJWT,
	isAdminRole,
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existBuyById),
	validateFields,
];

module.exports = {
	getBuysValidator,
	getBuyValidator,
	postBuyValidator,
	putBuyValidator,
	deleteBuyValidator,
};
