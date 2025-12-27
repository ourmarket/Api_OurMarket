const { Router } = require('express');
const {
	createBuy,
	getBuys,
	getBuyById,
	updateBuyPayment,
	cancelBuy,
} = require('../controllers/buy.controller');

const router = Router();

/**
 * {{url}}/api/buy
 */
router.post('/', createBuy);

router.get('/', getBuys);
router.get('/:id', getBuyById);

router.put('/:id/payment', updateBuyPayment);
router.put('/:id/cancel', cancelBuy);

module.exports = router;
