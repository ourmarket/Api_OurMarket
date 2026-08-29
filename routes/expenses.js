const { Router } = require('express');

const {
	getAllExpenses,
	getExpenses,
	postExpenses,
	postDailyBatchExpenses,
	postMonthlyProrateExpenses,
	putExpenses,
	deleteExpenses,
} = require('../controllers/expenses');
const {
	syncExpensesFromExcel,
	exportExpensesToExcel,
} = require('../controllers/expensesSync');
const {
	getExpensesValidation,
	postExpensesValidation,
	putExpensesValidation,
	deleteExpensesValidation,
} = require('../validations/expenses-validator');
const { validarJWT } = require('../middlewares');

const router = Router();

/**
 * {{url}}/api/expenses
 */

// Sincronización y exportación Excel (Hoja 1)
router.post('/sync-excel', [validarJWT], syncExpensesFromExcel);
router.get('/export-excel', [validarJWT], exportExpensesToExcel);

// Carga en lote por día y prorrateo mensual
router.post('/daily-batch', [validarJWT], postDailyBatchExpenses);
router.post('/monthly-prorate', [validarJWT], postMonthlyProrateExpenses);

// Plantillas de Gastos (MongoDB)
const {
	getTemplates,
	createTemplate,
	updateTemplate,
	deleteTemplate,
} = require('../controllers/expensesTemplate');

router.get('/templates', [validarJWT], getTemplates);
router.post('/templates', [validarJWT], createTemplate);
router.put('/templates/:id', [validarJWT], updateTemplate);
router.delete('/templates/:id', [validarJWT], deleteTemplate);

// Obtener todos los gastos
router.get('/', getAllExpenses);

// Obtener un gasto por id
router.get('/:id', getExpensesValidation, getExpenses);

// Crear gasto individual
router.post('/', postExpensesValidation, postExpenses);

// Actualizar gasto
router.put('/:id', putExpensesValidation, putExpenses);

// Borrar gasto
router.delete('/:id', deleteExpensesValidation, deleteExpenses);

module.exports = router;
