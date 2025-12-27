// controllers/buy.controller.js

const { default: mongoose } = require('mongoose');
const { Buy } = require('../models');
const { generateDocumentCode } = require('../services/documentNumber.service');
const PurchaseFlowService = require('../services/purchaseFlow.service');

/**
 * CREATE Buy
 * ----------
 * Registra compromiso de compra (factura / cuenta corriente)
 */
exports.createBuy = async (req, res) => {
	try {
		const code = await generateDocumentCode({
			tenantId: req.tenant.clientId, // o req.tenant.id
			prefix: 'COM',
		});
		const buy = await PurchaseFlowService.createBuy({
			code,
			purchaseOrderId: req.body.purchaseOrderId,
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

	const filter = { state: true, superUser: req.tenant._id };

	if (supplier) filter.supplier = supplier;
	if (status) filter.status = status;
	if (purchaseOrder) filter.purchaseOrder = purchaseOrder;

	const buys = await Buy.find(filter)
		.populate('supplier')
		.populate('purchaseOrder')
		.sort({ date: -1 });

	res.json(buys);
};

/**
 * GET Buy by ID
 */
exports.getBuyById = async (req, res) => {
	const buy = await Buy.findById(req.params.id)
		.populate('supplier')
		.populate('purchaseOrder')
		.populate('payments.createdBy', ['name', 'lastName']);

	if (!buy) {
		return res.status(404).json({ message: 'Buy not found' });
	}

	res.json(buy);
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
