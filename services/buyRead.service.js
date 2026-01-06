const { Buy, GoodsReceipt } = require('../models');

class BuyReadService {
	static async getBuyDetail(buyId) {
		const buy = await Buy.findById(buyId)
			.populate('supplier')
			.populate('purchaseOrder')
			.populate('payments.createdBy', ['name', 'lastName'])
			.lean();

		if (!buy) {
			throw new Error('Buy not found');
		}

		const receipts = await GoodsReceipt.find({ buyId })
			.populate('receivedBy', ['name', 'lastName'])
			.lean();

		// -----------------------------
		// Calcular receiptStatus
		// -----------------------------
		const orderedByProduct = {};
		buy.items.forEach((item) => {
			orderedByProduct[item.product.toString()] = item.quantity;
		});

		const receivedByProduct = {};
		receipts.forEach((receipt) => {
			receipt.items.forEach((item) => {
				const key = item.product.toString();
				receivedByProduct[key] =
					(receivedByProduct[key] || 0) + item.quantityReceived;
			});
		});

		const totalOrdered = Object.values(orderedByProduct).reduce(
			(a, b) => a + b,
			0
		);
		const totalReceived = Object.values(receivedByProduct).reduce(
			(a, b) => a + b,
			0
		);

		let receiptStatus = 'none';
		if (totalReceived > 0 && totalReceived < totalOrdered) {
			receiptStatus = 'partial';
		}
		if (totalReceived >= totalOrdered && totalOrdered > 0) {
			receiptStatus = 'complete';
		}

		return {
			...buy,
			receipts,
			receiptStatus,
		};
	}
}

module.exports = BuyReadService;
