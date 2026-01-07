const { Buy, GoodsReceipt, PurchaseAdjustment } = require('../models');

/**
 * PURCHASE ADJUSTMENT SERVICE
 * ---------------------------
 * Implementa las reglas contables del ajuste de compras
 *
 * PRINCIPIOS:
 * - La Buy es INMUTABLE
 * - El ajuste SIEMPRE es negativo
 * - El ajuste corrige deuda, no stock
 * - El ajuste NO modifica pagos
 * - El ajuste puede estar vinculado a una recepción (opcional)
 */
class PurchaseAdjustmentService {
	/**
	 * Crear un ajuste contable sobre una compra
	 */
	static async create({
		code,
		buyId,
		type,
		reason,
		items,
		goodsReceiptId,
		userId,
		superUserId,
	}) {
		/**
		 * 1️⃣ Validar compra
		 */
		const buy = await Buy.findById(buyId);
		//console.log('buy>>>>>>>>>>>', buy);
		//console.log('items>>>>>>>>>>', items);

		if (!buy) {
			throw new Error('La compra no existe!!');
		}

		/**
		 * 2️⃣ Validar recepción (si existe)
		 */
		let goodsReceipt = null;

		if (goodsReceiptId) {
			goodsReceipt = await GoodsReceipt.findById(goodsReceiptId);

			if (!goodsReceipt) {
				throw new Error('La recepción de mercadería no existe');
			}

			// El modelo GoodsReceipt usa buyId
			if (goodsReceipt.buyId.toString() !== buy._id.toString()) {
				throw new Error('La recepción no pertenece a la compra indicada');
			}
		}

		/**
		 * 3️⃣ Validar ítems contra la compra
		 */
		const calculatedItems = [];
		let totalAmount = 0;

		for (const item of items) {
			const buyItem = buy.items.find((i) => {
				const idA = i.product._id
					? i.product._id.toString()
					: i.product.toString();
				const idB = item.product.toString();
				return idA === idB;
			});

			if (!buyItem) {
				throw new Error('Uno de los productos no pertenece a la compra');
			}

			const quantity = item.quantity;
			const unitAmount = item.unitAmount ?? buyItem.unitCost;

			if (quantity <= 0) {
				throw new Error('La cantidad debe ser mayor a 0');
			}

			/**
			 * El total de línea SIEMPRE NEGATIVO
			 */
			const lineTotal = quantity * unitAmount * -1;

			calculatedItems.push({
				product: item.product,
				nameSnapshot: buyItem.nameSnapshot,
				quantity,
				unitAmount,
				lineTotal,
				reason: item.reason,
			});

			totalAmount += lineTotal;
		}

		/**
		 * 4️⃣ Validación contable CRÍTICA
		 */
		if (totalAmount >= 0) {
			throw new Error('El total del ajuste debe ser negativo');
		}

		/**
		 * 5️⃣ Crear ajuste (DOCUMENTO HISTÓRICO)
		 */
		const adjustment = await PurchaseAdjustment.create({
			code,
			type,
			buyId: buy._id,
			supplier: buy.supplier,
			goodsReceipt: goodsReceipt?._id,
			items: calculatedItems,
			totalAmount,
			reason,
			createdBy: userId,
			superUser: superUserId,
		});

		// 6️⃣ Registrar en el historial de la compra
		buy.history.push({
			action: 'ADJUSTMENT_LINKED',
			description: `Ajuste vinculado con código ${code} (${type})`,
			performedBy: userId,
			meta: { totalAmount, adjustmentId: adjustment._id },
		});
		await buy.save();

		return adjustment;
	}

	/**
	 * Obtener todos los ajustes del tenant
	 */
	static async getAll(superUserId) {
		return PurchaseAdjustment.find({
			superUser: superUserId,
			state: true,
		})
			.sort({ createdAt: -1 })
			.populate('buyId', 'code')
			.populate('supplier', 'businessName')
			.populate('createdBy', 'name lastName');
	}

	/**
	 * Obtener ajustes de una compra
	 */
	static async getByBuy(buyId) {
		return PurchaseAdjustment.find({
			buyId,
			state: true,
		})
			.sort({ createdAt: -1 })
			.populate('createdBy', 'name lastName')
			.populate('goodsReceipt', 'code');
	}

	/**
	 * Obtener ajuste puntual
	 */
	static async getById(adjustmentId) {
		return PurchaseAdjustment.findById(adjustmentId)
			.populate('buyId', 'code total')
			.populate('supplier', 'businessName email phone address')
			.populate('goodsReceipt', 'code')
			.populate('createdBy', 'name lastName');
	}

	/**
	 * Calcular saldo REAL de una compra
	 * ---------------------------------
	 * No persiste nada.
	 * Se usa para UI, pagos y validaciones.
	 */
	static async calculateBuyBalance(buyId) {
		const buy = await Buy.findById(buyId);

		if (!buy) {
			throw new Error('La compra no existe');
		}

		const adjustments = await PurchaseAdjustment.find({
			buyId,
			state: true,
		});

		const totalAdjustments = adjustments.reduce(
			(acc, adj) => acc + adj.totalAmount,
			0
		);

		const totalPayments = buy.payments.reduce((acc, p) => acc + p.amount, 0);

		const balance = buy.total - totalPayments + totalAdjustments;

		return {
			total: buy.total,
			totalPayments,
			totalAdjustments,
			balance,
		};
	}
}

module.exports = PurchaseAdjustmentService;
