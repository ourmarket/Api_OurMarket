const Expenses = require('../models/expenses');
const ExpensesV2 = require('../models/expensesV2');

/**
 * Returns the appropriate Expenses model based on EXPENSES_MODEL_VERSION env var
 * @returns {import('mongoose').Model}
 */
const getExpensesModel = () => {
	const version = (process.env.EXPENSES_MODEL_VERSION || 'v2').toLowerCase();
	if (version === 'v2') {
		return ExpensesV2;
	}
	return Expenses;
};

module.exports = {
	getExpensesModel,
	Expenses,
	ExpensesV2,
};
