const { validateFields } = require('../middlewares');
const { check, body } = require('express-validator');
const { existDistributorById } = require('../helpers');
const { Distributor } = require('../models');
const { hasRole } = require('../middlewares/hasRole');

const getDistributorValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existDistributorById),
	validateFields,
];
const postDistributorValidator = [
	check('businessName', 'La Razón Social es obligatoria').not().isEmpty(),
	check('cuit', 'El CUIT es obligatorio').not().isEmpty(),
	body('email')
		.notEmpty()
		.withMessage('El email es obligatorio')
		.bail()
		.isEmail()
		.withMessage('Debe ser un email válido')
		.bail()
		.custom(async (email) => {
			const existEmail = await Distributor.findOne({ email });
			if (existEmail) {
				throw new Error(`El email: ${email}, ya está registrado`);
			}
		}),
	check('phone', 'El telefono  es obligatorio').not().isEmpty(),
	check('address', 'La dirección es obligatoria').not().isEmpty(),
	check('province', 'La provincia es obligatoria').not().isEmpty(),
	check('city', 'La ciudad es obligatoria').not().isEmpty(),
	check('zip', 'El código postal es obligatorio').not().isEmpty(),
	validateFields,
];
const putDistributorValidator = [
	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existDistributorById),
	validateFields,
];
const deleteDistributorValidator = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existDistributorById),
	validateFields,
];

module.exports = {
	getDistributorValidator,
	postDistributorValidator,
	putDistributorValidator,
	deleteDistributorValidator,
};
