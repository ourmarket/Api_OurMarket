const { ProductLot, Stock, Product } = require('../models');

class StockReconciliationService {
	/**
	 * Recalculate Aggregate Stock based on active Lots (FIFO Truth)
	 * @param {string} productId
	 * @param {string} superUser
	 */
	static async reconcileProduct(productId, superUser) {
		// 1. Sum active lots (The Truth)
		const aggregation = await ProductLot.aggregate([
			{
				$match: {
					product: productId, // Mongoose handles casting if passed as ID
					superUser: superUser, // Mongoose handles casting
					currentQuantity: { $gt: 0 }, // Only active stock
					state: true,
				},
			},
			{
				$group: {
					_id: null,
					totalRealQuantity: { $sum: '$currentQuantity' },
				},
			},
		]);

		const realTotal = aggregation[0]?.totalRealQuantity || 0;

		// 2. Get current flawed Stock snapshot
		const stockSnapshot = await Stock.findOne({
			product: productId,
			superUser,
		});

		let oldValue = 0;
		let wasFixed = false;

		if (stockSnapshot) {
			oldValue = stockSnapshot.quantityAvailable;

			// Only update if drift exists
			// Using a small epsilon for floats if needed, but usually strict equality for stock counts
			if (Math.abs(oldValue - realTotal) > 0.0001) {
				stockSnapshot.quantityAvailable = realTotal;
				await stockSnapshot.save();

				// Also update Legacy Product field if used
				await Product.findByIdAndUpdate(productId, {
					stockAvailable: realTotal,
				});

				wasFixed = true;
			}
		} else {
			// Create if missing
			await Stock.create({
				product: productId,
				superUser,
				quantityAvailable: realTotal,
				quantityReserved: 0, // Cannot infer reserved from lots easily without reservation Logic in Lots, assume 0 or keep existing logic
			});
			wasFixed = true;
		}

		return {
			productId,
			oldValue,
			newValue: realTotal,
			wasFixed,
		};
	}

	/**
	 * Reconcile All Products for a Tenant
	 */
	static async reconcileAll(superUser) {
		const products = await Product.find({ superUser, state: true }).select(
			'_id'
		);

		const results = {
			processed: 0,
			corrected: 0,
			details: [],
		};

		for (const p of products) {
			const res = await this.reconcileProduct(p._id, superUser);
			results.processed++;
			if (res.wasFixed) {
				results.corrected++;
				results.details.push(res);
			}
		}

		return results;
	}
}

module.exports = StockReconciliationService;
