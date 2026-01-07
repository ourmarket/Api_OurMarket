const express = require('express');
const router = express.Router();

const PurchaseAdjustmentController = require('../controllers/purchaseAdjustment.controller');
const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');

/**
 * =========================
 * PURCHASE ADJUSTMENTS (Ajuste)
 * =========================
 */

router.post(
	'/',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseAdjustmentController.createAdjustment
);

router.get(
	'/',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseAdjustmentController.getAdjustments
);

router.get(
	'/by-buy/:buyId',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseAdjustmentController.getAdjustmentsByBuy
);

router.get(
	'/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseAdjustmentController.getAdjustmentById
);

module.exports = router;
