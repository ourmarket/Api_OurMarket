const { Router } = require('express');
const {
	getTemplates,
	createTemplate,
	updateTemplate,
	deleteTemplate,
} = require('../controllers/expensesTemplate');
const { validarJWT } = require('../middlewares');

const router = Router();

/**
 * {{url}}/api/expenses-templates
 */

router.get('/', [validarJWT], getTemplates);
router.post('/', [validarJWT], createTemplate);
router.put('/:id', [validarJWT], updateTemplate);
router.delete('/:id', [validarJWT], deleteTemplate);

module.exports = router;
