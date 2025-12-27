const { Router } = require('express');
const {
	OrderLegacy,
	Sale,
	Client,
	Ofert,
	Product,
	SuperUser,
	Stock,
	StockMovement,
	BuyLegacy,
	Buy,
	ProductLegacy,
} = require('../models');
const ClientSalesSummary = require('../models/clientSalesSummary');
const DailySalesSummary = require('../models/dailySalesSummary');
const router = Router();
const { Types } = require('mongoose');

const { ObjectId } = require('mongodb');

/**
 * {{url}}/api/scripts/migrate-sales
 *
 * MIGRACIÓN:
 * Order (viejo) → Sale (nuevo)
 *
 * ⚠️ USAR UNA SOLA VEZ EN PRODUCCIÓN
 */
router.get('/migrate-sales', async (req, res) => {
	try {
		let migrated = 0;
		let skipped = 0;

		/**
		 * 1️⃣ Definimos qué es una VENTA en el sistema viejo
		 * Ajustá este filtro si tu lógica era distinta
		 */
		const orders = await OrderLegacy.find({
			status: 'Entregado', // o el estado que usabas
			state: true,
		});

		console.log('Total de ventas viejas: ', orders.length);

		for (const order of orders) {
			/**
			 * 2️⃣ Evitar duplicados
			 */
			const alreadyMigrated = await Sale.findOne({
				legacyOrderId: order._id,
			});

			if (alreadyMigrated) {
				skipped++;
				continue;
			}

			/**
			 * 3️⃣ Mapear items
			 */
			const items = order.orderItems.map((item) => {
				const total = item.totalPrice ?? item.unitPrice * item.totalQuantity;
				const unitCost = item.unitCost ?? 0;

				return {
					product: item.productId,
					name: item.name,
					img: item.img,
					quantity: item.totalQuantity,
					unitPrice: item.unitPrice,
					unitCost,
					total,
					totalCost: unitCost * item.totalQuantity,
				};
			});

			/**
			 * 4️⃣ Totales
			 */
			const totals = {
				quantity: items.reduce((acc, i) => acc + i.quantity, 0),
				amount: items.reduce((acc, i) => acc + i.total, 0),
				cost: items.reduce((acc, i) => acc + i.totalCost, 0),
			};

			totals.profit = totals.amount - totals.cost;

			/**
			 * 5️⃣ Crear Sale
			 */
			await Sale.create({
				order: order._id, // referencia legacy
				legacyOrderId: order._id,
				legacySource: 'OrderV1',

				user: order.userId,
				customer: order.client,

				items,
				totals,

				payment: order.payment,
				paid: order.paid,

				saleDate: order.updatedAt || order.createdAt,
				superUser: order.superUser,
			});

			migrated++;

			// migrado 1 de 1000
			console.log('Migrado ', migrated, 'de ', orders.length);
		}

		res.json({
			ok: true,
			migrated,
			skipped,
			totalProcessed: orders.length,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			ok: false,
			error: error.message,
		});
	}
});
router.get('/rebuildClientSalesSummary', async (req, res) => {
	try {
		console.log('🔄 Rebuilding client_sales_summary...');

		// ⚠️ Opcional: limpiar antes de reconstruir
		await ClientSalesSummary.deleteMany({});
		console.log('🧹 Colección client_sales_summary limpiada');

		// 1️⃣ Aggregate ventas (SIN unwind)
		const cursor = Sale.aggregate([
			{
				$match: {
					//state: true,
					customer: { $ne: null },
				},
			},
			{
				$group: {
					_id: {
						superUser: '$superUser',
						client: '$customer',
					},

					totalBuy: { $sum: '$totals.amount' },
					totalCost: { $sum: '$totals.cost' },
					totalProfits: { $sum: '$totals.profit' },
					ordersCount: { $sum: 1 },

					paymentCash: { $sum: '$payment.cash' },
					paymentTransfer: { $sum: '$payment.transfer' },
					paymentDebt: { $sum: '$payment.debt' },

					firstSaleAt: { $min: '$saleDate' },
					lastSaleAt: { $max: '$saleDate' },
				},
			},
		]).cursor({ batchSize: 500 });

		let processed = 0;

		for await (const doc of cursor) {
			const { superUser, client } = doc._id;

			// 2️⃣ Obtener estado del cliente
			const customerDoc = await Client.findById(client).select('active').lean();

			await ClientSalesSummary.updateOne(
				{
					superUser,
					client,
				},
				{
					$set: {
						active: customerDoc?.active ?? false,
						firstSaleAt: doc.firstSaleAt,
						lastSaleAt: doc.lastSaleAt,
						updatedAt: new Date(),
					},
					$setOnInsert: {
						superUser,
						client,
					},
					$inc: {
						totalBuy: doc.totalBuy,
						totalCost: doc.totalCost,
						totalProfits: doc.totalProfits,
						ordersCount: doc.ordersCount,

						'payment.cash': doc.paymentCash,
						'payment.transfer': doc.paymentTransfer,
						'payment.debt': doc.paymentDebt,
					},
				},
				{ upsert: true }
			);

			processed++;

			if (processed % 100 === 0) {
				console.log(`✔ ${processed} clientes procesados`);
			}
		}

		console.log(`✅ Finalizado. Total clientes procesados: ${processed}`);
		res.json({
			ok: true,
			msg: `✅ Finalizado. Total clientes procesados: ${processed}`,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			ok: false,
			error: error.message,
		});
	}
});
router.get('/rebuildDailySalesSummary', async (req, res) => {
	try {
		console.log('🔄 Rebuilding daily_sales_summary...');

		// 1️⃣ Limpiar colección
		await DailySalesSummary.deleteMany({});
		console.log('🧹 Colección daily_sales_summary limpiada');

		// 2️⃣ Aggregate desde Sales
		const cursor = Sale.aggregate([
			/* {
				$match: {
					state: true,
				},
			}, */
			{
				$project: {
					superUser: 1,
					saleDate: 1,

					cash: { $ifNull: ['$payment.cash', 0] },
					transfer: { $ifNull: ['$payment.transfer', 0] },
					debt: { $ifNull: ['$payment.debt', 0] },

					totalSell: '$totals.amount',
					totalCost: '$totals.cost',
					totalProfits: '$totals.profit',
				},
			},
			{
				// normalizamos fecha al día
				$addFields: {
					day: {
						$dateTrunc: {
							date: '$saleDate',
							unit: 'day',
						},
					},
				},
			},
			{
				// agrupamos por comercio + día
				$group: {
					_id: {
						superUser: '$superUser',
						day: '$day',
					},

					cashTotal: { $sum: '$cash' },
					transferTotal: { $sum: '$transfer' },
					debtTotal: { $sum: '$debt' },

					totalSell: { $sum: '$totalSell' },
					totalCost: { $sum: '$totalCost' },
					totalProfits: { $sum: '$totalProfits' },
				},
			},
			{
				$project: {
					_id: 0,
					superUser: '$_id.superUser',
					date: '$_id.day',

					cashTotal: 1,
					transferTotal: 1,
					debtTotal: 1,
					totalPayment: {
						$add: ['$cashTotal', '$transferTotal', '$debtTotal'],
					},

					totalSell: 1,
					totalCost: 1,
					totalProfits: 1,
				},
			},
		]).cursor({ batchSize: 500 });

		// 3️⃣ Inserción masiva
		let bulk = [];
		let count = 0;

		for await (const doc of cursor) {
			bulk.push({
				insertOne: {
					document: doc,
				},
			});

			if (bulk.length === 500) {
				await DailySalesSummary.bulkWrite(bulk);
				count += bulk.length;
				bulk = [];
			}
		}

		if (bulk.length) {
			await DailySalesSummary.bulkWrite(bulk);
			count += bulk.length;
		}

		console.log(`✅ Migración completada (${count} días generados)`);

		res.json({
			ok: true,
			msg: `✅ Migración completada (${count} días generados)`,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			ok: false,
			error: error.message,
		});
	}
});
router.get('/migrate-products', async (req, res) => {
	try {
		let migrated = 0;
		let skipped = 0;
		let skippedNoOfert = 0;
		let skippedNoPrice = 0;

		/**
		 * 1️⃣ Traemos SOLO oferts activas
		 */
		const oferts = await Ofert.find({
			state: true,
		}).populate('product');
		console.log(oferts);

		for (const ofert of oferts) {
			const legacy = ofert.product;

			if (!legacy) {
				skippedNoOfert++;
				continue;
			}

			/**
			 * 2️⃣ Evitar duplicados
			 */
			const exists = await Product.findOne({
				legacyProductId: legacy._id,
			});

			if (exists) {
				skipped++;
				continue;
			}

			/**
			 * 3️⃣ Stock inicial (snapshot)
			 */
			const stockAvailable = Array.isArray(legacy.stock)
				? legacy.stock.reduce((acc, s) => acc + (s.stock || 0), 0)
				: 0;

			/**
			 * 4️⃣ Crear producto nuevo
			 */
			await Product.create({
				name: legacy.name,
				brand: legacy.brand,
				unit: legacy.unit,
				type: legacy.type,
				description: legacy.description,
				img: legacy.img,
				category: legacy.category,

				available: legacy.available,
				state: legacy.state,

				// 🔒 REGLA CLAVE
				price: ofert.basePrice,
				hasOffer: ofert.ofert === true,
				offerPrice: ofert.ofert ? ofert.basePrice : null,

				stockAvailable,

				createdBy: legacy.user,
				superUser: legacy.superUser,

				legacyProductId: legacy._id,
				legacySource: 'ProductV1',
			});

			migrated++;
		}

		res.json({
			ok: true,
			migrated,
			skipped,
			skippedNoOfert,
			skippedNoPrice,
			totalOferts: oferts.length,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			ok: false,
			error: error.message,
		});
	}
});
router.post('/migrate-stock-from-legacy', async (req, res) => {
	try {
		const products = await Product.find(
			{
				legacyProductId: { $exists: true, $ne: null },
			},
			{ _id: 1, legacyProductId: 1, superUser: 1 }
		).lean();

		if (!products.length) {
			return res.json({
				ok: true,
				msg: 'No hay productos para migrar',
			});
		}

		const movements = [];

		for (const product of products) {
			/**
			 * 1️⃣ Verificar si ya fue migrado este producto
			 */
			const alreadyMigrated = await StockMovement.exists({
				product: product._id,
				reason: 'ADJUST',
			});

			if (alreadyMigrated) continue;

			/**
			 * 2️⃣ Obtener stock legacy de ESE producto
			 */
			const stockAgg = await Stock.aggregate([
				{
					$match: {
						product: product.legacyProductId,
						state: true,
						superUser: product.superUser,
					},
				},
				{
					$group: {
						_id: null,
						totalStock: { $sum: '$stock' },
					},
				},
			]);

			const totalStock = stockAgg[0]?.totalStock || 0;

			if (totalStock <= 0) continue;

			/**
			 * 3️⃣ Crear movimiento inicial
			 */
			movements.push({
				product: product._id,
				quantity: totalStock,
				type: 'IN',
				reason: 'ADJUST',
				reference: product.legacyProductId, // trazabilidad perfecta
				createdBy: null, // sistema
				superUser: product.superUser,
				meta: {
					migration: true,
					source: 'legacy-stock',
				},
			});
		}

		if (!movements.length) {
			return res.json({
				ok: true,
				msg: 'No hubo movimientos para migrar',
			});
		}

		await StockMovement.insertMany(movements);

		return res.json({
			ok: true,
			migratedProducts: movements.length,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			ok: false,
			msg: error.message,
		});
	}
});
router.get('/migrate-products-full', async (req, res) => {
	try {
		let migrated = 0;
		let skipped = 0;
		let withOffer = 0;
		let withoutOffer = 0;

		console.log('🚀 Iniciando migración COMPLETA ProductLegacy → Product');

		/**
		 * 1️⃣ Traer TODOS los productos legacy
		 */
		const legacyProducts = await ProductLegacy.find({}).lean();
		const total = legacyProducts.length;

		console.log(`📦 Productos legacy encontrados: ${total}`);

		/**
		 * 2️⃣ Traer SOLO oferts activas
		 */
		const oferts = await Ofert.find({ state: true }).lean();

		/**
		 * 3️⃣ Crear mapa productLegacyId → ofert
		 */
		const ofertMap = new Map();
		for (const ofert of oferts) {
			if (ofert.product) {
				ofertMap.set(String(ofert.product), ofert);
			}
		}

		console.log(`💲 Oferts activas encontradas: ${ofertMap.size}`);

		/**
		 * 4️⃣ Migración
		 */
		for (let i = 0; i < total; i++) {
			const legacy = legacyProducts[i];

			const progress = (((i + 1) / total) * 100).toFixed(2);
			console.log(`➡️ [${i + 1}/${total}] ${progress}% | ${legacy.name}`);

			/**
			 * Evitar duplicados
			 */
			const exists = await Product.findOne({
				legacyProductId: legacy._id,
			}).lean();

			if (exists) {
				skipped++;
				continue;
			}

			/**
			 * Buscar ofert activa
			 */
			const ofert = ofertMap.get(String(legacy._id));

			let price = null;
			let hasOffer = false;
			let offerPrice = null;

			if (ofert && typeof ofert.basePrice === 'number') {
				price = ofert.basePrice;
				hasOffer = ofert.ofert === true;
				offerPrice = ofert.ofert === true ? ofert.basePrice : null;
				withOffer++;
			} else {
				withoutOffer++;
			}

			/**
			 * Crear producto
			 */
			await Product.create({
				legacyProductId: legacy._id,
				legacySource: 'ProductV1',

				name: legacy.name,
				brand: legacy.brand,
				unit: legacy.unit,
				type: legacy.type,
				description: legacy.description,
				img: legacy.img,
				category: legacy.category,

				available: legacy.available,
				state: legacy.state,

				price,
				hasOffer,
				offerPrice,

				stockAvailable: 0, // 🔒 snapshot después

				createdBy: legacy.user,
				superUser: legacy.superUser,
			});

			migrated++;
		}

		console.log('✅ Migración completa finalizada');

		return res.json({
			ok: true,
			totalLegacy: total,
			migrated,
			skipped,
			withOffer,
			withoutOffer,
		});
	} catch (error) {
		console.error('💥 ERROR EN MIGRACIÓN:', error);
		return res.status(500).json({
			ok: false,
			error: error.message,
		});
	}
});

router.get('/migrate-buys', async (req, res) => {
	try {
		let migrated = 0;
		let skippedDuplicated = 0;
		let skippedEmpty = 0;
		let skippedProducts = 0;

		console.log('🚀 Migración BuyLegacy → Buy');

		const legacyBuys = await BuyLegacy.find({}).lean();
		const total = legacyBuys.length;

		console.log(`📦 Compras legacy encontradas: ${total}`);

		for (let i = 0; i < total; i++) {
			const legacyBuy = legacyBuys[i];
			const progress = (((i + 1) / total) * 100).toFixed(2);

			console.log(
				`➡️ [${i + 1}/${total}] ${progress}% | BuyLegacy ${legacyBuy._id}`
			);

			/**
			 * 1️⃣ Evitar duplicados
			 */
			const exists = await Buy.findOne({
				legacyBuyId: legacyBuy._id,
			}).lean();

			if (exists) {
				skippedDuplicated++;
				continue;
			}

			/**
			 * 2️⃣ Migrar productos
			 */
			const items = [];

			for (const item of legacyBuy.products || []) {
				if (!item.productId) {
					skippedProducts++;
					continue;
				}

				const product = await Product.findOne({
					legacyProductId: item.productId,
				}).lean();

				if (!product) {
					skippedProducts++;
					console.log(
						`⚠️ ProductLegacy sin Product: ${item.productId}`
					);
					continue;
				}

				items.push({
					product: product._id,
					nameSnapshot: item.name,
					quantity: item.quantity,
					unitCost: item.unitCost,
				});
			}

			/**
			 * 3️⃣ Si no hay items válidos, no crear Buy
			 */
			if (items.length === 0) {
				skippedEmpty++;
				continue;
			}

			/**
			 * 4️⃣ Crear Buy
			 */
			await Buy.create({
				legacyBuyId: legacyBuy._id,
				legacySource: 'BuyV1',

				supplier: legacyBuy.supplier,
				items,

				total: legacyBuy.total,
				payment: {
					cash: legacyBuy.payment?.cash || 0,
					transfer: legacyBuy.payment?.transfer || 0,
				},

				status: legacyBuy.paid ? 'PAID' : 'PENDING',

				createdBy: legacyBuy.user,
				superUser: legacyBuy.superUser,

				createdAt: legacyBuy.createdAt,
				updatedAt: legacyBuy.updatedAt,
			});

			migrated++;
		}

		console.log('✅ Migración Buy finalizada');

		return res.json({
			ok: true,
			totalLegacy: total,
			migrated,
			skippedDuplicated,
			skippedEmpty,
			skippedProducts,
		});
	} catch (error) {
		console.error('💥 ERROR MIGRANDO BUY:', error);
		return res.status(500).json({
			ok: false,
			error: error.message,
		});
	}
});


router.get('/diagnostic-buy-products', async (req, res) => {
	try {
		console.log('🔎 Iniciando diagnóstico BuyLegacy → Product');

		const buys = await BuyLegacy.find(
			{ state: true },
			{ products: 1, superUser: 1 }
		).lean();

		console.log(`📦 BuyLegacy encontrados: ${buys.length}`);

		let totalItems = 0;
		let ok = 0;
		let missing = 0;

		const missingProducts = new Map();

		for (const buy of buys) {
			for (const item of buy.products) {
				totalItems++;

				const legacyProductId = item.productId;
				const superUserId = buy.superUser;

				const productExists = await Product.exists({
					legacyProductId,
					superUser: superUserId,
				});

				if (productExists) {
					ok++;
				} else {
					missing++;

					const key = legacyProductId.toString();
					if (!missingProducts.has(key)) {
						missingProducts.set(key, {
							legacyProductId,
							superUser: superUserId,
							count: 1,
						});
					} else {
						missingProducts.get(key).count++;
					}
				}
			}
		}

		console.log('--------------------------------------');
		console.log(`📊 Total ítems analizados: ${totalItems}`);
		console.log(`✅ Con Product nuevo: ${ok}`);
		console.log(`❌ Sin Product nuevo: ${missing}`);
		console.log(`🧩 Productos legacy huérfanos: ${missingProducts.size}`);
		console.log('--------------------------------------');

		if (missingProducts.size > 0) {
			console.log('🚨 LISTA DE ProductLegacy SIN Product:');
			for (const entry of missingProducts.values()) {
				console.log(
					`- ProductLegacy: ${entry.legacyProductId} | SuperUser: ${entry.superUser} | Usado ${entry.count} veces`
				);
			}
		}

		return res.json({
			ok: true,
			buys: buys.length,
			totalItems,
			okItems: ok,
			missingItems: missing,
			missingProducts: Array.from(missingProducts.values()),
		});
	} catch (error) {
		console.error('💥 ERROR diagnóstico:', error);
		return res.status(500).json({
			ok: false,
			msg: error.message,
		});
	}
});

module.exports = router;
