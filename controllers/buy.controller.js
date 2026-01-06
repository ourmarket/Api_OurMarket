// controllers/buy.controller.js

const { default: mongoose } = require('mongoose');
const { Buy, PurchaseOrder, BuySummary, GoodsReceipt } = require('../models');
const { generateDocumentCode } = require('../services/documentNumber.service');
const PurchaseFlowService = require('../services/purchaseFlow.service');
const BuyReadService = require('../services/buyRead.service');
const { calculateReceiptStatus } = require('../services/receiptStatus.service');

/**
 * CREATE Buy
 * ----------
 * Registra compromiso de compra (factura / cuenta corriente)
 */
exports.createBuy = async (req, res) => {
	try {
		const purchaseOrder = await PurchaseOrder.findById(req.body.purchaseOrder);
		if (!purchaseOrder) {
			return res.status(404).json({ message: 'Orden de compra no encontrada' });
		}
		if (purchaseOrder.status !== 'APPROVED') {
			return res.status(400).json({ message: 'Orden de compra no aprobada' });
		}
		if (purchaseOrder.purchaseOrder) {
			return res
				.status(400)
				.json({ message: 'Orden de compra ya tiene una compra' });
		}
		const code = await generateDocumentCode({
			tenantId: req.tenant.clientId, // o req.tenant.id
			prefix: 'COM',
		});
		const buy = await PurchaseFlowService.createBuy({
			code,
			purchaseOrder: req.body.purchaseOrder,
			items: req.body.items,
			supplier: req.body.supplier,
			documentNumber: req.body.documentNumber,
			date: req.body.date,
			amount: req.body.amount,
			createdBy: req.user.id,
			superUser: req.tenant._id,
		});

		res.status(201).json(buy);
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: error.message });
	}
};

/**
 * REGISTER PAYMENT
 * ----------------
 * Permite pagos parciales o totales
 */
exports.registerPayment = async (req, res) => {
	try {
		const payment = await PurchaseFlowService.registerPayment({
			buyId: req.params.id,
			amount: req.body.amount,
			paymentMethod: req.body.paymentMethod,
			reference: req.body.reference,
			paidBy: req.user.id,
		});

		res.status(201).json(payment);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

/**
 * LIST Buys
 * ---------
 * Soporta filtros típicos
 */
exports.getBuys = async (req, res) => {
	const { supplier, status, purchaseOrder } = req.query;

	const filter = {
		state: true,
		superUser: req.tenant._id,
	};

	if (supplier) filter.supplier = supplier;
	if (status) filter.status = status;
	if (purchaseOrder) filter.purchaseOrder = purchaseOrder;

	const buys = await Buy.find(filter)
		.populate('supplier')
		.populate('purchaseOrder')
		.sort({ date: -1 })
		.lean(); // 👈 importante

	const buyIds = buys.map((buy) => buy._id);

	const receipts = await GoodsReceipt.find({
		buyId: { $in: buyIds },
		state: true,
	}).lean();

	// Agrupar recepciones por compra
	const receiptsByBuy = {};
	receipts.forEach((receipt) => {
		const buyId = receipt.buyId.toString();
		if (!receiptsByBuy[buyId]) {
			receiptsByBuy[buyId] = [];
		}
		receiptsByBuy[buyId].push(receipt);
	});

	const result = buys.map((buy) => {
		const buyReceipts = receiptsByBuy[buy._id.toString()] || [];

		const receiptStatus = calculateReceiptStatus(buy, buyReceipts);

		return {
			...buy,
			receiptStatus,
		};
	});

	res.json(result);
};
/**
 * GET Buy by ID
 */
exports.getBuyById = async (req, res) => {
	try {
		const result = await BuyReadService.getBuyDetail(req.params.id);
		res.json(result);
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

exports.getPayments = async (req, res) => {
	const buys = await Buy.find({ state: true, superUser: req.tenant._id })
		.populate('supplier', 'businessName')
		.populate('payments.createdBy', 'name lastName');

	const payments = buys.flatMap((buy) =>
		buy.payments.map((p) => ({
			id: p._id,
			buyId: buy._id,
			paymentNumber: buy.code, // o generás PAG-xxx
			supplier: buy.supplier,
			date: p.date,
			paymentMethod: p.paymentMethod,
			amount: p.amount,
			reference: p.reference,
			createdBy: p.createdBy,
		}))
	);

	res.json(payments);
};

exports.getPaymentById = async (req, res) => {
	const { id } = req.params;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ message: 'ID de pago inválido' });
	}

	try {
		const payment = await Buy.aggregate([
			{
				$match: {
					state: true,
					'payments._id': new mongoose.Types.ObjectId(id),
				},
			},

			{ $unwind: '$payments' },

			{
				$match: {
					'payments._id': new mongoose.Types.ObjectId(id),
				},
			},

			// Proveedor
			{
				$lookup: {
					from: 'suppliers',
					localField: 'supplier',
					foreignField: '_id',
					as: 'supplier',
				},
			},
			{ $unwind: '$supplier' },

			// Usuario creador del pago
			{
				$lookup: {
					from: 'users',
					localField: 'payments.createdBy',
					foreignField: '_id',
					as: 'createdBy',
				},
			},
			{ $unwind: '$createdBy' },

			{
				$project: {
					_id: 0,

					id: '$payments._id',
					amount: '$payments.amount',
					paymentMethod: '$payments.paymentMethod',
					reference: '$payments.reference',
					date: '$payments.date',

					createdBy: {
						_id: '$createdBy._id',
						name: '$createdBy.name',
						lastName: '$createdBy.lastName',
					},

					supplier: {
						_id: '$supplier._id',
						name: '$supplier.name',
					},

					buy: {
						id: '$_id',
						code: '$code',
						documentNumber: '$documentNumber',
						total: '$total',
						status: '$status',
					},
				},
			},
		]);

		if (!payment.length) {
			return res.status(404).json({ message: 'Pago no encontrado' });
		}

		res.json(payment[0]);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al obtener el pago' });
	}
};

/**
 * GET Pending Buys
 * ----------------
 * Retorna compras con estado PENDING o PARTIAL (deudas)
 */
exports.getPendingBuys = async (req, res) => {
	try {
		const buys = await Buy.find({
			state: true,
			superUser: req.tenant._id,
			status: { $in: ['PENDING', 'PARTIAL'] },
		})
			.populate('supplier', 'businessName')
			.sort({ date: -1 });

		res.json(buys);
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ message: 'Error al obtener las compras pendientes' });
	}
};

/**
 * GET Purchase Summary
 * --------------------
 * Retorna estadísticas para el dashboard de compras (Cards e imagen proporcionada)
 */
exports.getPurchaseSummary = async (req, res) => {
	try {
		const superUser = req.tenant._id;

		// 1. Pendientes de Aprobación (PurchaseOrder con status SUBMITTED)
		const pendingApproval = await PurchaseOrder.countDocuments({
			state: true,
			superUser,
			status: 'SUBMITTED',
		});

		// 2. Pendientes de Pago (Buy con status PENDING o PARTIAL)
		const pendingPayment = await Buy.countDocuments({
			state: true,
			superUser,
			status: { $in: ['PENDING', 'PARTIAL'] },
		});

		// 3. Comprado este Mes (Suma de Buy.total en el mes actual)
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const endOfLastMonth = new Date(
			now.getFullYear(),
			now.getMonth(),
			0,
			23,
			59,
			59
		);

		const currentMonthAggregation = await Buy.aggregate([
			{
				$match: {
					state: true,
					superUser: new mongoose.Types.ObjectId(superUser),
					date: { $gte: startOfMonth },
				},
			},
			{
				$group: {
					_id: null,
					total: { $sum: '$total' },
				},
			},
		]);

		const lastMonthAggregation = await Buy.aggregate([
			{
				$match: {
					state: true,
					superUser: new mongoose.Types.ObjectId(superUser),
					date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
				},
			},
			{
				$group: {
					_id: null,
					total: { $sum: '$total' },
				},
			},
		]);

		const currentMonthTotal = currentMonthAggregation[0]?.total || 0;
		const lastMonthTotal = lastMonthAggregation[0]?.total || 0;

		// Calcular variación porcentual
		let percentageVariation = 0;
		if (lastMonthTotal > 0) {
			percentageVariation =
				((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
		} else if (currentMonthTotal > 0) {
			percentageVariation = 100; // Incremento del 100% si el mes pasado fue 0
		}

		// Persistir en BuySummary para historial
		await BuySummary.findOneAndUpdate(
			{
				month: now.getMonth() + 1,
				year: now.getFullYear(),
				superUser,
			},
			{
				totalAmount: currentMonthTotal,
				count: await Buy.countDocuments({
					state: true,
					superUser,
					date: { $gte: startOfMonth },
				}),
			},
			{ upsert: true }
		);

		res.json({
			pendingApproval,
			pendingPayment,
			currentMonthTotal,
			lastMonthTotal,
			percentageVariation: parseFloat(percentageVariation.toFixed(2)),
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al obtener el resumen de compras' });
	}
};
