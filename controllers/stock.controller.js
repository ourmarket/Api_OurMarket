const StockService = require('../services/stock.service');

/**
 * GET /api/stock
 * Lista detallada de stock por producto
 */
exports.getStockList = async (req, res) => {
	try {
		const { category, query, stockStatus, page, limit } = req.query;
		const superUser = req.tenant._id;

		const result = await StockService.getStockList({
			superUser,
			category,
			query,
			stockStatus,
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 10,
		});

		res.json(result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

/**
 * GET /api/stock/summary
 * Métricas agregadas para las cards del dashboard
 */
exports.getStockSummary = async (req, res) => {
	try {
		const superUser = req.tenant._id;
		const summary = await StockService.getStockSummary(superUser);
		res.json(summary);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

/**
 * GET /api/stock/:productId
 * Detalle completo de un producto y su stock
 */
exports.getStockByProduct = async (req, res) => {
	try {
		const { productId } = req.params;
		const superUser = req.tenant._id;

		const detail = await StockService.getStockByProduct(productId, superUser);
		res.json(detail);
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

// 🚀 New Reconciliation Endpoint
exports.reconcileStock = async (req, res) => {
	try {
		const { productId } = req.body;
		const superUser = req.tenant._id;

		if (productId) {
			const result = await StockReconciliationService.reconcileProduct(
				productId,
				superUser
			);
			return res.status(200).json({ ok: true, data: result });
		} else {
			const result = await StockReconciliationService.reconcileAll(superUser);
			return res.status(200).json({ ok: true, data: result });
		}
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};
