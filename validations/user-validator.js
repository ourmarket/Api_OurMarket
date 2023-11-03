const { check } = require('express-validator');
const {
	isValidRol,
	existUserById,
	existRoleById,
	getTokenData,
} = require('../helpers');
const { validarJWT, validateFields, isAdminRole } = require('../middlewares');
const { User } = require('../models');

const getUsersValidations = [validarJWT, validateFields];

const getUserValidations = [
	validarJWT,
	check('id', 'No es un ID válido').isMongoId(),
	check('id').custom(existUserById),
	check('rol').custom(isValidRol),
	validateFields,
];

const postUserValidations = [
	check('name', 'El nombre es obligatorio').not().isEmpty(),
	check('lastName', 'El nombre es obligatorio').not().isEmpty(),
	check('password', 'El password debe de ser más de 6 letras').isLength({
		min: 6,
	}),
	check('email').custom(async (value, { req }) => {
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const exist = await User.findOne({
			email: value,
			state: true,
			superUser: tokenData.UserInfo.superUser,
		});
		if (exist && exist.email) {
			throw new Error(`El email ${value}, ya está registrado`);
		}
	}),
	check('phone', 'El teléfono es obligatorio').not().isEmpty(),
	check('phone', 'Solo números').isNumeric(),
	check('phone').custom(async (value, { req }) => {
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const exist = await User.findOne({
			phone: value,
			state: true,
			superUser: tokenData.UserInfo.superUser,
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
	check('password', 'El password debe de ser más de 6 letras').isLength({
		min: 6,
	}),
	check('email').not().isEmpty(),
	check('phone', 'El teléfono es obligatorio').not().isEmpty(),
	check('phone', 'Solo números').isNumeric(),
	check('phone').not().isEmpty(),
	check('role', 'No es un ID válido').isMongoId(),
	check('role').custom(existRoleById),
	validateFields,
];

const putUserValidations = [
	validarJWT,

	check('id', 'No es un ID válido').isMongoId(),
	check('id').custom(existUserById),
	validateFields,
];

const patchUserValidations = [
	validarJWT,
	check('id', 'No es un ID válido').isMongoId(),
	check('id').custom(existUserById),
	validateFields,
];

const deleteUserValidations = [
	validarJWT,
	isAdminRole,
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
