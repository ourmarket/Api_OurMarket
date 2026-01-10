const StockService = require('../services/stock.service');
const { generateDocumentCode } = require('../services/documentNumber.service');

/**
 * POST /api/stock-adjustments
 * Registro de ajuste manual de inventario
 */
exports.createAdjustment = async (req, res) => {
	try {
		const { reason, observations, items } = req.body;
		const superUser = req.tenant._id;
		const createdBy = req.user._id;

		// 1. Generar código correlativo para el ajuste
		const code = await generateDocumentCode({
			tenantId: superUser,
			prefix: 'AJI', // Ajuste de Inventario
		});

		// 2. Ejecutar ajuste a través del servicio
		const adjustment = await StockService.adjustStock({
			code,
			reason,
			observations,
			items,
			createdBy,
			superUser,
		});

		res.status(201).json(adjustment);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};
