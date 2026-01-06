// controllers/goodsReceipt.controller.js

const { GoodsReceipt } = require('../models');
const { generateDocumentCode } = require('../services/documentNumber.service');
const PurchaseFlowService = require('../services/purchaseFlow.service');

/**
 * CREATE Goods Receipt
 * --------------------
 * Registra ingreso físico de mercadería
 * Impacta stock vía PurchaseFlowService
 */
exports.createGoodsReceipt = async (req, res) => {
	try {
		const code = await generateDocumentCode({
			tenantId: req.tenant.clientId,
			prefix: 'REC',
		});

		const receipt = await PurchaseFlowService.receiveGoods({
			code,
			buyId: req.body.buyId, // 👈 CLAVE
			supplier: req.body.supplier,
			generalObservations: req.body.generalObservations,
			items: req.body.items,
			receivedBy: req.user.id,
			receivedAt: req.body.receivedAt,
			superUser: req.tenant._id,
		});

		res.status(201).json(receipt);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

/**
 * LIST Goods Receipts
 * ------------------
 * Soporta filtros básicos
 */
exports.getGoodsReceipts = async (req, res) => {
	const { supplier, purchaseOrder } = req.query;

	const filter = { state: true };

	if (supplier) filter.supplier = supplier;
	if (purchaseOrder) filter.purchaseOrder = purchaseOrder;

	const receipts = await GoodsReceipt.find(filter)
		.populate('supplier')
		.populate('purchaseOrder')
		.sort({ createdAt: -1 });

	res.json(receipts);
};

/**
 * GET Goods Receipt by ID
 */
exports.getGoodsReceiptById = async (req, res) => {
	const receipt = await GoodsReceipt.findById(req.params.id)
		.populate('supplier')
		.populate('purchaseOrder')
		.populate('items.product');

	if (!receipt) {
		return res.status(404).json({ message: 'Goods receipt not found' });
	}

	res.json(receipt);
};
