const { Router } = require('express');
const { getBuys, getBuy, postBuy, deleteBuy } = require('../controllers/buy');

const router = Router();

/**
 * {{url}}/api/buy
 */

router.get('/', getBuys);
router.get('/:id', getBuy);
router.post('/', postBuy);
router.delete('/:id', deleteBuy);
/* router.put('/:id', putCashierSessionValidation, putCashierSession);
router.delete('/:id', deleteCashierSessionValidation, deleteCashierSession); */

module.exports = router;

/* TODO agregar validaciones */
