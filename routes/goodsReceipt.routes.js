// routes/goodsReceipt.routes.js

const express = require('express');
const router = express.Router();

const GoodsReceiptController = require('../controllers/goodsReceipt.controller');
const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');

/**
 * =========================
 * GOODS RECEIPTS (Ingreso)
 * =========================
 */

/**
 * Crear ingreso de mercadería
 * - Impacta stock (StockMovement +)
 * - Puede ser parcial
 * - Asociado a PurchaseOrder
 */
router.post(
	'/',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	GoodsReceiptController.createGoodsReceipt
);

/**
 * Listado de ingresos
 * Filtros:
 * - purchaseOrder
 * - supplier
 * - date range
 */
router.get(
	'/',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	GoodsReceiptController.getGoodsReceipts
);

/**
 * Detalle de ingreso
 */
router.get(
	'/:id',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	GoodsReceiptController.getGoodsReceiptById
);

module.exports = router;
