const { Router } = require('express');
const {
	getAllStock,
	getStock,
	deleteStock,
	putStock,
	postStock,
	getAvailableStock,
} = require('../controllers/stock');

const router = Router();

/**
 * {{url}}/api/stock
 */

router.get('/', getAllStock);

router.get('/available', getAvailableStock);
router.get('/:id', getStock);
router.post('/', postStock);
router.put('/:id', putStock);
router.delete('/:id', deleteStock);

module.exports = router;

/* TODO agregar validaciones */
