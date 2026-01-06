// services/stock.service.js

const { StockMovement } = require('../models');

class StockService {
	static async registerMovement({
		product,
		quantity,
		type,
		reason,
		reference,
		createdBy,
		superUser,
		meta = {},
	}) {
		if (quantity <= 0) {
			throw new Error('Quantity must be positive');
		}

		return StockMovement.create({
			product,
			quantity,
			type,
			reason,
			reference,
			createdBy,
			superUser,
			meta,
		});
	}

	/**
	 * Helper semántico
	 */
	static async receivePurchaseItem({
		product,
		quantity,
		goodsReceiptId,
		userId,
		superUser,
	}) {
		return this.registerMovement({
			product,
			quantity,
			type: 'IN',
			reason: 'BUY',
			reference: goodsReceiptId,
			createdBy: userId,
			superUser,
		});
	}
}

module.exports = StockService;
