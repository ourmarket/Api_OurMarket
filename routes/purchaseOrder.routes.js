// routes/purchaseOrder.routes.js

const express = require('express');
const router = express.Router();

const PurchaseOrderController = require('../controllers/purchaseOrder.controller');

const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');

/**
 * =========================
 * PURCHASE ORDERS
 * =========================
 */

/**
 * CREATE
 * - Siempre crea en estado DRAFT
 */
router.post(
	'/',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseOrderController.createPurchaseOrder
);

/**
 * LIST
 * - Filtros: status, supplier
 */
router.get(
	'/',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseOrderController.getPurchaseOrders
);

/**
 * GET BY ID
 */
router.get(
	'/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseOrderController.getPurchaseOrderById
);

/**
 * UPDATE (solo DRAFT)
 * - Edita items y expectedDate
 */
router.put(
	'/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseOrderController.updatePurchaseOrder
);

/**
 * CHANGE STATUS
 * - DRAFT → SUBMITTED → APPROVED
 */
router.post(
	'/:id/status',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseOrderController.changePurchaseOrderStatus
);

/**
 * CLOSE
 * - Solo si APPROVED
 */
router.post(
	'/:id/close',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseOrderController.closePurchaseOrder
);

/**
 * CANCEL (soft delete)
 */
router.post(
	'/:id/cancel',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	PurchaseOrderController.cancelPurchaseOrder
);

module.exports = router;
