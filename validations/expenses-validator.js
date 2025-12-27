const { check } = require('express-validator');
const { existExpensesById } = require('../helpers');
const { validateFields } = require('../middlewares');
const { hasRole } = require('../middlewares/hasRole');

const getExpensesValidation = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existExpensesById),
	validateFields,
];
const postExpensesValidation = [
	check('expensesName', 'El gasto es obligatorio').not().isEmpty(),
	check('category', 'La categoria del gasto es obligatorio').not().isEmpty(),
	check('amount', 'El monto es obligatorio').not().isEmpty(),
	validateFields,
];

const putExpensesValidation = [
	check('expensesName', 'El gasto es obligatorio').not().isEmpty(),
	check('category', 'La categoria del gasto es obligatorio').not().isEmpty(),
	check('amount', 'El monto es obligatorio').not().isEmpty(),
	check('id').custom(existExpensesById),
	validateFields,
];

const deleteExpensesValidation = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existExpensesById),
	validateFields,
];

module.exports = {
	getExpensesValidation,
	postExpensesValidation,
	putExpensesValidation,
	deleteExpensesValidation,
};
