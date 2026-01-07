const {
	Stock,
	StockMovement,
	Product,
	InventoryAdjustment,
} = require('../models');
const mongoose = require('mongoose');

class StockService {
	/**
	 * Registrar un movimiento de stock y actualizar el snapshot (Stock)
	 */
	static async registerMovement({
		stockCode,
		product: productId,
		quantity,
		type, // IN, OUT, RESERVED, RELEASED
		reason, // BUY, SALE, ORDER, ADJUST, RETURN
		reference,
		createdBy,
		superUser,
		meta = {},
	}) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			if (quantity <= 0) {
				throw new Error('La cantidad debe ser positiva');
			}

			// 1. Obtener o crear el snapshot de stock
			let stock = await Stock.findOne({
				product: productId,
				superUser,
			}).session(session);

			if (!stock) {
				stock = new Stock({
					product: productId,
					superUser,
					quantityAvailable: 0,
					quantityReserved: 0,
				});
			}

			// 2. Aplicar lógica de actualización
			switch (type) {
				case 'IN':
					stock.quantityAvailable += quantity;
					break;
				case 'OUT':
					if (stock.quantityAvailable < quantity) {
						throw new Error('Stock insuficiente para realizar esta salida');
					}
					stock.quantityAvailable -= quantity;
					break;
				case 'RESERVED':
					if (stock.quantityAvailable < quantity) {
						throw new Error('Stock insuficiente para reservar');
					}
					stock.quantityAvailable -= quantity;
					stock.quantityReserved += quantity;
					break;
				case 'RELEASED':
					if (stock.quantityReserved < quantity) {
						throw new Error('No hay suficiente stock reservado para liberar');
					}
					stock.quantityReserved -= quantity;
					stock.quantityAvailable += quantity;
					break;
				default:
					throw new Error('Tipo de movimiento no válido');
			}

			await stock.save({ session });

			// 3. Crear el movimiento inmutable

			const movement = await StockMovement.create(
				[
					{
						code: stockCode,
						product: productId,
						quantity,
						type,
						reason,
						reference,
						createdBy,
						superUser,
						meta,
					},
				],
				{ session }
			);

			// 4. Sincronizar con el modelo Product (Legacy/Compatibility)
			await Product.findByIdAndUpdate(
				productId,
				{ stockAvailable: stock.quantityAvailable },
				{ session }
			);

			await session.commitTransaction();
			return movement[0];
		} catch (error) {
			console.log(error);
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	}

	/**
	 * Obtener lista de stock actual con filtros
	 */
	static async getStockList({
		superUser,
		category,
		query,
		stockStatus,
		page = 1,
		limit = 10000,
	}) {
		const skip = (page - 1) * limit;

		const productFilter = { superUser, state: true };

		if (category) productFilter.category = category;

		if (query) {
			productFilter.$or = [
				{ name: { $regex: query, $options: 'i' } },
				{ code: { $regex: query, $options: 'i' } },
			];
		}

		// 🔹 1. Traemos productos paginados
		const products = await Product.find(productFilter)
			.populate('category', 'name')
			.sort({ name: 1 })
			.skip(skip)
			.limit(limit)
			.lean();

		const totalProducts = await Product.countDocuments(productFilter);

		// 🔹 2. Traemos stock asociado
		const productIds = products.map((p) => p._id);

		const stocks = await Stock.find({
			product: { $in: productIds },
			superUser,
		}).lean();

		// 🔹 3. Enriquecemos + calculamos estado
		let records = products.map((p) => {
			const stock = stocks.find(
				(s) => s.product.toString() === p._id.toString()
			);

			const available = stock?.quantityAvailable ?? 0;
			const reserved = stock?.quantityReserved ?? 0;
			const minStock = p.minStock ?? 0;

			let computedStatus = 'NORMAL';

			if (available <= 0) computedStatus = 'ZERO';
			else if (available < minStock) computedStatus = 'LOW';

			return {
				...p,
				productId: p._id,
				quantityAvailable: available,
				quantityReserved: reserved,
				stockStatus: computedStatus,
			};
		});

		// 🔹 4. Filtrado por estado (YA calculado)
		if (stockStatus) {
			records = records.filter((r) => r.stockStatus === stockStatus);
		}

		return {
			data: records,
			total: totalProducts,
			page,
			limit,
		};
	}

	/**
	 * Resumen de métricas para dashboard de stock
	 */
	static async getStockSummary(superUser) {
		const totalProducts = await Product.countDocuments({
			superUser,
			state: true,
		});

		const zeroStockCount = await Product.countDocuments({
			superUser,
			state: true,
			stockAvailable: { $lte: 0 },
		});

		const lowStockCount = await Product.countDocuments({
			superUser,
			state: true,
			stockAvailable: { $gt: 0 },
			$expr: { $lt: ['$stockAvailable', '$minStock'] },
		});

		const normalStockCount = await Product.countDocuments({
			superUser,
			state: true,
			stockAvailable: { $gt: 0 },
			$expr: { $gte: ['$stockAvailable', '$minStock'] },
		});

		// DEBUG: Ver productos considerados NORMAL
		const normalProducts = await Product.find({
			superUser,
			state: true,
			stockAvailable: { $gt: 0 },
			$expr: { $gte: ['$stockAvailable', '$minStock'] },
		}).select('name stockAvailable minStock');
		console.log('--- PRODUCTOS NORMALES ---');
		normalProducts.forEach((p) =>
			console.log(
				`Nombre: ${p.name} | Disponible: ${p.stockAvailable} | Minimo: ${p.minStock}`
			)
		);
		console.log('--------------------------');

		// Total físico sumando todas las unidades disponibles
		const totalStockUnitsAggregation = await Stock.aggregate([
			{ $match: { superUser: new mongoose.Types.ObjectId(superUser) } },
			{
				$group: {
					_id: null,
					total: { $sum: '$quantityAvailable' },
				},
			},
		]);

		return {
			totalProducts,
			normalStockCount,
			lowStockCount,
			zeroStockCount,
			totalStockUnits: totalStockUnitsAggregation[0]?.total || 0,
		};
	}

	/**
	 * Detalle de stock por producto
	 */
	static async getStockByProduct(productId, superUser) {
		const product = await Product.findById(productId)
			.populate('category', 'name')
			.lean();

		if (!product) throw new Error('Producto no encontrado');

		const stock = await Stock.findOne({ product: productId, superUser }).lean();

		const lastMovements = await StockMovement.find({
			product: productId,
			superUser,
		})
			.sort({ createdAt: -1 })
			.limit(10)
			.populate('createdBy', 'name lastName')
			.lean();

		return {
			product,
			stock: {
				available: stock?.quantityAvailable || 0,
				reserved: stock?.quantityReserved || 0,
			},
			lastMovements,
		};
	}

	/**
	 * Lista de movimientos con filtros
	 */
	static async getStockMovements({
		superUser,
		productId,
		type,
		reason,
		startDate,
		endDate,
		page = 1,
		limit = 20,
	}) {
		const skip = (page - 1) * limit;
		const filter = { superUser };

		if (productId) filter.product = productId;
		if (type) filter.type = type;
		if (reason) filter.reason = reason;

		if (startDate || endDate) {
			filter.createdAt = {};
			if (startDate) filter.createdAt.$gte = new Date(startDate);
			if (endDate) filter.createdAt.$lte = new Date(endDate);
		}

		const movements = await StockMovement.find(filter)
			.populate('product', 'name img')
			.populate('createdBy', 'name lastName')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		const total = await StockMovement.countDocuments(filter);

		return {
			data: movements,
			total,
			page,
			limit,
		};
	}

	/**
	 * Ajuste manual de stock
	 */
	static async adjustStock({
		code,
		items,
		reason,
		observations,
		createdBy,
		superUser,
	}) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// 1. Crear documento InventoryAdjustment
			const adjustment = await InventoryAdjustment.create(
				[
					{
						code,
						reason,
						observations,
						items,
						createdBy,
						superUser,
					},
				],
				{ session }
			);

			// 2. Registrar movimientos para cada item
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				await this.registerMovementInternal(
					{
						stockCode: `${code}-${i + 1}`,
						product: item.product,
						quantity: item.quantity,
						type: item.type, // IN | OUT
						reason: 'ADJUST',
						reference: adjustment[0]._id,
						createdBy,
						superUser,
						meta: { adjustmentCode: code },
					},
					session
				);
			}

			await session.commitTransaction();
			return adjustment[0];
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	}

	/**
	 * Versión interna que acepta sesión para transacciones
	 */
	static async registerMovementInternal(
		{
			stockCode,
			product: productId,
			quantity,
			type,
			reason,
			reference,
			createdBy,
			superUser,
			meta,
		},
		session
	) {
		if (quantity <= 0) throw new Error('La cantidad debe ser positiva');

		let stock = await Stock.findOne({ product: productId, superUser }).session(
			session
		);

		if (!stock) {
			stock = new Stock({
				product: productId,
				superUser,
				quantityAvailable: 0,
				quantityReserved: 0,
			});
		}

		switch (type) {
			case 'IN':
				stock.quantityAvailable += quantity;
				break;
			case 'OUT':
				if (stock.quantityAvailable < quantity) {
					throw new Error('Stock insuficiente');
				}
				stock.quantityAvailable -= quantity;
				break;
			case 'RESERVED':
				if (stock.quantityAvailable < quantity) {
					throw new Error('Stock insuficiente');
				}
				stock.quantityAvailable -= quantity;
				stock.quantityReserved += quantity;
				break;
			case 'RELEASED':
				if (stock.quantityReserved < quantity) {
					throw new Error('No hay stock reservado');
				}
				stock.quantityReserved -= quantity;
				stock.quantityAvailable += quantity;
				break;
		}

		await stock.save({ session });

		await StockMovement.create(
			[
				{
					code: stockCode,
					product: productId,
					quantity,
					type,
					reason,
					reference,
					createdBy,
					superUser,
					meta,
				},
			],
			{ session }
		);

		await Product.findByIdAndUpdate(
			productId,
			{ stockAvailable: stock.quantityAvailable },
			{ session }
		);
	}
}

module.exports = StockService;
