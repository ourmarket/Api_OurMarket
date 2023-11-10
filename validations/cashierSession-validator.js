const { validateFields, validarJWT, isAdminRole } = require('../middlewares');

const getCashierSessionsValidation = [validarJWT, validateFields];
const getCashierSessionValidation = [validarJWT, validateFields];
const postCashierSessionValidation = [validarJWT, validateFields];

const putCashierSessionValidation = [validarJWT, validateFields];

const deleteCashierSessionValidation = [
	validarJWT,
	isAdminRole,
	validateFields,
];

module.exports = {
	getCashierSessionsValidation,
	getCashierSessionValidation,
	postCashierSessionValidation,
	putCashierSessionValidation,
	deleteCashierSessionValidation,
};
