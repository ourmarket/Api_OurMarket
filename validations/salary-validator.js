const { validateFields } = require('../middlewares');
const { check } = require('express-validator');
const { existSalaryById, existEmployeeById } = require('../helpers');
const { hasRole } = require('../middlewares/hasRole');

const getSalaryValidator = [
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existSalaryById),
	validateFields,
];
const postSalaryValidator = [
	check('employeeId', 'No es un id de Mongo válido').isMongoId(),
	check('employeeId').custom(existEmployeeById),
	check('amount', 'El monto es obligatorio').not().isEmpty(),
	check('typeOfCalculation', 'El tipo de calculo es obligatorio')
		.not()
		.isEmpty(),
	check('typeOfContract', 'El tipo de contrato es obligatorio').not().isEmpty(),
	validateFields,
];
const putSalaryValidator = [
	check('id', 'No es un id de Mongo').isMongoId(),
	check('id').custom(existSalaryById),
	validateFields,
];
const deleteSalaryValidator = [
	hasRole('ADMIN_ROLE'),
	check('id', 'No es un id de Mongo válido').isMongoId(),
	check('id').custom(existSalaryById),
	validateFields,
];

module.exports = {
	getSalaryValidator,
	postSalaryValidator,
	putSalaryValidator,
	deleteSalaryValidator,
};
