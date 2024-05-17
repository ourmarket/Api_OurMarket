const { Router } = require('express');
const {
	getBuys,
	getBuy,
	postBuy,
	deleteBuy,
	putBuy,
} = require('../controllers/buy');
const {
	getBuysValidator,
	getBuyValidator,
	postBuyValidator,
	putBuyValidator,
	deleteBuyValidator,
} = require('../validations/buy-validator');

const router = Router();

/**
 * {{url}}/api/buy
 */

router.get('/', getBuysValidator, getBuys);
router.get('/:id', getBuyValidator, getBuy);
router.post('/', postBuyValidator, postBuy);
router.put('/:id', putBuyValidator, putBuy);
router.delete('/:id', deleteBuyValidator, deleteBuy);

module.exports = router;
