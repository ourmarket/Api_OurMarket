const { validateFields, } = require('../middlewares');
const { hasRole } = require('../middlewares/hasRole');

const getCashierSessionsValidation = [validateFields];
const getCashierSessionValidation = [validateFields];
const postCashierSessionValidation = [validateFields];

const putCashierSessionValidation = [validateFields];

const deleteCashierSessionValidation = [

	hasRole('ADMIN_ROLE'),
	validateFields,
];

module.exports = {
	getCashierSessionsValidation,
	getCashierSessionValidation,
	postCashierSessionValidation,
	putCashierSessionValidation,
	deleteCashierSessionValidation,
};
