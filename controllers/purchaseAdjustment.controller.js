const PurchaseAdjustmentService = require('../services/purchaseAdjustment.service');

/**
 * Crear un ajuste sobre una compra existente
 * Punto de NO retorno contable
 */
exports.createAdjustment = async (req, res, next) => {
	try {
		const { purchaseId } = req.params;
		const userId = req.user._id;

		const {
			type, // QUANTITY | PRICE | DAMAGED | OTHER
			reason, // Texto libre obligatorio
			items, // Items ajustados
			financialImpact, // Información monetaria
		} = req.body;

		// Validaciones mínimas (estructura, no negocio)
		if (!type || !reason) {
			return res.status(400).json({
				message: 'El tipo de ajuste y el motivo son obligatorios',
			});
		}

		if (!Array.isArray(items) || items.length === 0) {
			return res.status(400).json({
				message: 'Debe indicar al menos un ítem ajustado',
			});
		}

		const adjustment = await PurchaseAdjustmentService.createAdjustment({
			purchaseId,
			userId,
			type,
			reason,
			items,
			financialImpact,
		});

		return res.status(201).json(adjustment);
	} catch (error) {
		next(error);
	}
};

/**
 * Obtener todos los ajustes de una compra
 */
exports.getAdjustmentsByPurchase = async (req, res, next) => {
	try {
		const { purchaseId } = req.params;

		const adjustments =
			await PurchaseAdjustmentService.getAdjustmentsByPurchase(purchaseId);

		return res.status(200).json(adjustments);
	} catch (error) {
		next(error);
	}
};

/**
 * Obtener un ajuste específico
 */
exports.getAdjustmentById = async (req, res, next) => {
	try {
		const { id } = req.params;

		const adjustment = await PurchaseAdjustmentService.getById(id);

		if (!adjustment) {
			return res.status(404).json({
				message: 'Ajuste no encontrado',
			});
		}

		return res.status(200).json(adjustment);
	} catch (error) {
		next(error);
	}
};

/**
 * Obtener todos los ajustes del tenant
 */
exports.getAdjustments = async (req, res, next) => {
	try {
		const superUserId = req.tenant._id;
		const adjustments = await PurchaseAdjustmentService.getAll(superUserId);
		res.json(adjustments);
	} catch (error) {
		next(error);
	}
};

/**
 * Obtener ajustes por compra
 */
exports.getAdjustmentsByBuy = async (req, res, next) => {
	try {
		const { buyId } = req.params;
		const adjustments = await PurchaseAdjustmentService.getByBuy(buyId);
		res.json(adjustments);
	} catch (error) {
		next(error);
	}
};
