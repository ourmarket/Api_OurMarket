const { ProductLot, Stock, StockMovement } = require('../models');

class StockFifoService {
	/**
	 * Create a new Stock Lot (Entry/Buy/Manufacture)
	 * AND record the Stock Movement
	 * @param {Object} params
	 * @param {string} params.productId
	 * @param {number} params.quantity
	 * @param {number} params.unitCost
	 * @param {string} params.type - 'BUY' | 'MANUFACTURE' | 'ADJUSTMENT'
	 * @param {string} params.reference - ID of origin
	 * @param {string} params.supplier - Optional
	 * @param {string} params.superUser
	 * @param {string} params.reason - Enums from StockMovement
	 * @param {string} params.code - Unique code for the movement
	 * @param {string} params.createdBy - User ID performing the action
	 * @param {Object} [session] - Mongoose transaction session
	 */
	static async createLot(
		{
			productId,
			quantity,
			unitCost,
			type,
			reference,
			supplier,
			superUser,
			reason,
			code,
			createdBy,
		},
		session = null
	) {
		if (!code) throw new Error('Stock Movement Code (STK) is required');
		if (quantity <= 0)
			throw new Error('Quantity must be positive to create a lot');

		// 1. Create Lot
		const lotData = {
			product: productId,
			type,
			reference,
			supplier,
			initialQuantity: quantity,
			currentQuantity: quantity,
			unitCost,
			superUser,
		};

		let lot;
		if (session) {
			[lot] = await ProductLot.create([lotData], { session });
		} else {
			lot = await ProductLot.create(lotData);
		}

		// 2. Update Aggregate Stock
		await Stock.findOneAndUpdate(
			{ product: productId, superUser },
			{ $inc: { quantityAvailable: quantity } },
			{ upsert: true, session }
		);

		// 3. Create Stock Movement (IN)
		const moveData = {
			code,
			product: productId,
			quantity: quantity, // Positive for IN
			type: 'IN',
			reason: reason || type, // e.g., 'BUY' or 'MANUFACTURE'
			reference, // e.g. BuyID
			cost: quantity * unitCost, // Total cost of this movement
			createdBy: createdBy || superUser,
			superUser,
			meta: { lotId: lot._id },
		};

		if (session) {
			await StockMovement.create([moveData], { session });
		} else {
			await StockMovement.create(moveData);
		}

		return lot;
	}

	/**
	 * Consume Stock using FIFO (First-In-First-Out)
	 * @param {Object} params
	 * @param {string} params.productId
	 * @param {number} params.quantity - Quantity to consume
	 * @param {string} params.reason - Reason for movement
	 * @param {string} params.reference - ID of Sales, Manufacture, etc.
	 * @param {string} params.superUser
	 * @param {string} params.code - Unique code for the movement
	 * @param {string} params.createdBy - User ID performing the action (optional fallback to superUser)
	 * @param {Object} [session] - Mongoose transaction session
	 */
	static async consumeFIFO(
		{ productId, quantity, reason, reference, superUser, code, createdBy },
		session = null
	) {
		if (!code) throw new Error('Stock Movement Code (STK) is required');
		if (quantity <= 0) throw new Error('Quantity must be positive');

		// 1. Get available lots sorted by date (Oldest first)
		const lots = await ProductLot.find({
			product: productId,
			superUser,
			currentQuantity: { $gt: 0 },
		})
			.sort({ createdAt: 1 })
			.session(session);

		let remaining = quantity;
		let totalCost = 0;
		const consumedLots = [];

		// Check if enough stock
		const totalAvailable = lots.reduce((acc, l) => acc + l.currentQuantity, 0);
		if (totalAvailable < quantity) {
			throw new Error(
				`Stock insuficiente para producto ${productId}. Req: ${quantity}, Disp: ${totalAvailable}`
			);
		}

		// 2. Iterate and consume
		for (const lot of lots) {
			if (remaining <= 0) break;

			const take = Math.min(lot.currentQuantity, remaining);

			// Update Lot
			lot.currentQuantity -= take;
			if (lot.currentQuantity === 0) lot.state = false; // Mark depleted? Optional depending on logic
			await lot.save({ session });

			// Calculate Cost
			const cost = take * lot.unitCost;
			totalCost += cost;

			consumedLots.push({
				lotId: lot._id,
				quantity: take,
				unitCost: lot.unitCost,
				totalCost: cost,
			});

			remaining -= take;
		}

		// 3. Update Aggregate Stock
		await Stock.findOneAndUpdate(
			{ product: productId, superUser },
			{ $inc: { quantityAvailable: -quantity } },
			{ session }
		);

		// 4. Record Global Movement (OUT)
		const moveData = {
			code,
			product: productId,
			quantity: quantity,
			type: 'OUT',
			reason,
			reference,
			cost: totalCost, // Real total cost
			createdBy: createdBy || superUser,
			superUser,
			meta: { consumedLots },
		};

		if (session) {
			await StockMovement.create([moveData], { session });
		} else {
			await StockMovement.create(moveData);
		}

		return {
			totalCost,
			averageUnitCost: totalCost / quantity,
			consumedLots,
		};
	}

	/**
	 * Estimate Cost without consuming (for Simulations/Quotes)
	 */
	static async getEstimatedCostFIFO(productId, quantity, superUser) {
		const lots = await ProductLot.find({
			product: productId,
			superUser,
			currentQuantity: { $gt: 0 },
		}).sort({ createdAt: 1 });

		let remaining = quantity;
		let totalCost = 0;
		let totalAvailable = 0;

		for (const lot of lots) {
			if (remaining <= 0) break;
			const take = Math.min(lot.currentQuantity, remaining);
			totalCost += take * lot.unitCost;
			remaining -= take;
			totalAvailable += lot.currentQuantity; // Keep track generally
		}

		if (remaining > 0) {
			throw new Error(`Stock insuficiente para estimación. Req: ${quantity}`);
		}

		return {
			totalCost,
			unitCost: totalCost / quantity,
		};
	}
}

module.exports = StockFifoService;
