const express = require('express');
const router = express.Router();
const StockController = require('../controllers/stock.controller');
const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');

// Middleware de aplicación para asegurar que viene del dashboard
router.use(allowApp(['dashboard']));

/**
 * GET /api/stock
 * Lista de stock por producto con filtros
 */
router.get('/', StockController.getStockList);

/**
 * GET /api/stock/summary
 * Métricas para las cards del dashboard
 */
router.get('/summary', StockController.getStockSummary);

/**
 * GET /api/stock/:productId
 * Detalle completo de un producto y su stock
 */
router.get('/:productId', StockController.getStockByProduct);

module.exports = router;
