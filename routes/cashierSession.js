const { Router } = require('express');
const {
	getCashierSessions,
	getCashierSession,
	postCashierSession,
	putCashierSession,
	deleteCashierSession,
} = require('../controllers/cashierSession');
const {
	getCashierSessionsValidation,
	getCashierSessionValidation,
	postCashierSessionValidation,
	putCashierSessionValidation,
	deleteCashierSessionValidation,
} = require('../validations/cashierSession-validator');

const router = Router();

/**
 * {{url}}/api/cashierSession
 */

router.get('/', getCashierSessionsValidation, getCashierSessions);
router.get('/:id', getCashierSessionValidation, getCashierSession);
router.post('/', postCashierSessionValidation, postCashierSession);
router.put('/:id', putCashierSessionValidation, putCashierSession);
router.delete('/:id', deleteCashierSessionValidation, deleteCashierSession);

module.exports = router;
