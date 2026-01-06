const { PurchaseOrder } = require('../models');
const { generateDocumentCode } = require('../services/documentNumber.service');
const PurchaseFlowService = require('../services/purchaseFlow.service');

/**
 * CREATE Purchase Order
 * ---------------------
 * Siempre se crea en estado DRAFT
 */
const createPurchaseOrder = async (req, res) => {
	try {
		const { supplier, items = [], expectedDate, status, notes = '' } = req.body;

		if (status !== 'DRAFT' && status !== 'SUBMITTED') {
			return res.status(400).json({
				message: 'Invalid status',
			});
		}

		const code = await generateDocumentCode({
			tenantId: req.tenant.clientId,
			prefix: 'OC',
		});

		const po = await PurchaseOrder.create({
			supplier,
			items,
			expectedDate,
			code,
			status,
			statusHistory: [
				{
					status,
					changedBy: req.user._id,
					changedAt: new Date(),
				},
			],
			notes,
			createdBy: req.user._id,
			superUser: req.tenant._id,
		});

		res.status(201).json({
			message: 'Purchase order created',
			data: {
				id: po._id,
				code: po.code,
				status: po.status,
			},
		});
	} catch (error) {
		res.status(500).json({
			message: 'Error creating purchase order',
			error: error.message,
		});
	}
};

/**
 * LIST Purchase Orders
 */
const getPurchaseOrders = async (req, res) => {
	const { status, supplier } = req.query;

	const filter = {
		state: true,
		superUser: req.tenant._id,
	};

	if (supplier) filter.supplier = supplier;

	if (status) {
		if (status === 'DRAFT') {
			filter.status = 'DRAFT';
			filter.createdBy = req.user._id;
		} else {
			filter.status = status;
		}
	} else {
		// Retornar todas las órdenes, pero de las DRAFT solo las propias
		filter.$or = [
			{ status: { $ne: 'DRAFT' } },
			{ status: 'DRAFT', createdBy: req.user._id },
		];
	}

	const orders = await PurchaseOrder.find(filter)
		.populate('supplier')
		.sort({ createdAt: -1 });

	res.json({
		data: orders,
	});
};

/**
 * GET Purchase Order by ID
 */
const getPurchaseOrderById = async (req, res) => {
	const po = await PurchaseOrder.findById(req.params.id)
		.populate('supplier')
		.populate('items.product')
		.populate('statusHistory.changedBy', ['name', 'lastName']);

	if (!po) {
		return res.status(404).json({
			message: 'Purchase order not found',
		});
	}

	res.json({
		data: po,
	});
};

/**
 * UPDATE Purchase Order
 * --------------------
 * Solo si está en DRAFT
 */
const updatePurchaseOrder = async (req, res) => {
	const po = await PurchaseOrder.findById(req.params.id);

	if (!po) {
		return res.status(404).json({ message: 'Purchase order not found' });
	}

	if (po.status !== 'DRAFT') {
		return res.status(400).json({
			message: 'Only draft purchase orders can be edited',
		});
	}

	po.items = req.body.items ?? po.items;
	po.expectedDate = req.body.expectedDate ?? po.expectedDate;
	po.supplier = req.body.supplier ?? po.supplier;

	await po.save();

	res.json({
		message: 'Purchase order updated',
		data: po,
	});
};

/**
 * CHANGE STATUS
 * -------------
 * DRAFT → SUBMITTED → APPROVED
 */
const changePurchaseOrderStatus = async (req, res) => {
	try {
		const { status } = req.body;

		const po = await PurchaseFlowService.changePurchaseOrderStatus(
			req.params.id,
			status,
			req.user._id
		);

		res.json({
			message: 'Status updated',
			data: {
				id: po._id,
				status: po.status,
			},
		});
	} catch (error) {
		res.status(400).json({
			message: error.message,
		});
	}
};

/**
 * CLOSE Purchase Order
 */
const closePurchaseOrder = async (req, res) => {
	try {
		const po = await PurchaseFlowService.closePurchaseOrder(
			req.params.id,
			req.user._id
		);

		res.json({
			message: 'Purchase order closed',
			data: {
				id: po._id,
				status: po.status,
			},
		});
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

/**
 * CANCEL Purchase Order
 */
const cancelPurchaseOrder = async (req, res) => {
	const po = await PurchaseOrder.findById(req.params.id);

	if (!po) {
		return res.status(404).json({ message: 'Purchase order not found' });
	}

	if (po.status === 'CLOSED') {
		return res.status(400).json({
			message: 'Closed purchase orders cannot be cancelled',
		});
	}

	po.status = 'CANCELLED';
	po.state = false;
	po.statusHistory.push({
		status: 'CANCELLED',
		changedBy: req.user._id,
		changedAt: new Date(),
	});

	await po.save();

	res.json({
		message: 'Purchase order cancelled',
	});
};

module.exports = {
	createPurchaseOrder,
	getPurchaseOrders,
	getPurchaseOrderById,
	updatePurchaseOrder,
	changePurchaseOrderStatus,
	closePurchaseOrder,
	cancelPurchaseOrder,
};
