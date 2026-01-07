const StockService = require('../services/stock.service');

/**
 * GET /api/stock-movements
 * Historial de movimientos con filtros
 */
exports.getStockMovements = async (req, res) => {
	try {
		const { productId, type, reason, startDate, endDate, page, limit } =
			req.query;
		const superUser = req.tenant._id;

		const result = await StockService.getStockMovements({
			superUser,
			productId,
			type,
			reason,
			startDate,
			endDate,
			page: parseInt(page) || 1,
			limit: parseInt(limit) || 20,
		});

		res.json(result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
