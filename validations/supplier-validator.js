const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existSupplierById } = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getSupplierValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existSupplierById),
	validateFields,
];
const postSupplierValidator = [
	check('businessName', 'La Razón Social es obligatoria').not().isEmpty(),
	check('cuit', 'El CUIT es obligatorio').not().isEmpty(),

	check('phone', 'El teléfono  es obligatorio').not().isEmpty(),
	check('address', 'La dirección es obligatoria').not().isEmpty(),
	check('province', 'La provincia es obligatoria').not().isEmpty(),
	check('city', 'La ciudad es obligatoria').not().isEmpty(),
	check('zip', 'El código postal es obligatorio').not().isEmpty(),
	validateFields,
];
const putSupplierValidator = [
	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existSupplierById),
	validateFields,
];
const deleteSupplierValidator = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existSupplierById),
	validateFields,
];

module.exports = {
	getSupplierValidator,
	postSupplierValidator,
	putSupplierValidator,
	deleteSupplierValidator,
};
