const { check } = require('express-validator');
const { isValidRol, existUserById, existRoleById } = require('../helpers');
const { validateFields } = require('../middlewares');
const { hasRole } = require('../middlewares/hasRole');
const { User } = require('../models');

const getUsersValidations = [validateFields];

const getUserValidations = [
	check('id', 'No es un ID válido').isMongoId(),
	check('id').custom(existUserById),
	check('rol').custom(isValidRol),
	validateFields,
];

const postUserValidations = [
	check('name', 'El nombre es obligatorio').not().isEmpty(),
	check('lastName', 'El nombre es obligatorio').not().isEmpty(),

	check('email').custom(async (value, { req }) => {
		const exist = await User.findOne({
			email: value,
			state: true,
			superUser: req.tenant._id,
		});
		if (exist && exist.email) {
			throw new Error(`El email ${value}, ya está registrado`);
		}
	}),
	check('phone', 'El teléfono es obligatorio').not().isEmpty(),
	check('phone', 'Solo números').isNumeric(),
	check('phone').custom(async (value, { req }) => {
		const exist = await User.findOne({
			phone: value,
			state: true,
			superUser: req.tenant._id,
		});
		if (exist && exist.phone) {
			throw new Error(`El teléfono ${value}, ya está registrado`);
		}
	}),
	check('role', 'No es un ID válido').isMongoId(),
	check('role').custom(existRoleById),
	validateFields,
];
const postNewAdminValidations = [
	check('name', 'El nombre es obligatorio').not().isEmpty(),
	check('lastName', 'El nombre es obligatorio').not().isEmpty(),
	check('email').not().isEmpty(),
	check('phone', 'El teléfono es obligatorio').not().isEmpty(),
	check('phone', 'Solo números').isNumeric(),
	check('phone').not().isEmpty(),
	check('role', 'No es un ID válido').isMongoId(),
	check('role').custom(existRoleById),
	validateFields,
];

const putUserValidations = [
	check('id', 'No es un ID válido').isMongoId(),
	check('id').custom(existUserById),
	validateFields,
];

const patchUserValidations = [
	check('id', 'No es un ID válido').isMongoId(),
	check('id').custom(existUserById),
	validateFields,
];

const deleteUserValidations = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un ID válido').isMongoId(),
	check('id').custom(existUserById),
	validateFields,
];

module.exports = {
	getUserValidations,
	postUserValidations,
	putUserValidations,
	deleteUserValidations,
	getUsersValidations,
	patchUserValidations,
	postNewAdminValidations,
};
