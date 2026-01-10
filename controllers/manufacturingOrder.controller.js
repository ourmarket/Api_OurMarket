const ManufacturingService = require('../services/manufacturing.service');
const { generateDocumentCode } = require('../services/documentNumber.service');

exports.createOrder = async (req, res) => {
	try {
		const { user } = req;

		const manufacturingOrderCode = await generateDocumentCode({
			tenantId: user.superUser,
			prefix: 'PROD', // Producción (Antes MO)
		});
		const data = {
			...req.body,
			createdBy: user._id,
			superUser: user.superUser,
			manufacturingOrderCode,
		};
		const result = await ManufacturingService.createOrder(data);
		res.status(201).json(result);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

exports.executeOrder = async (req, res) => {
	try {
		const { id } = req.params;
		const { user } = req;
		const result = await ManufacturingService.executeOrder(id, user);
		res.status(200).json(result);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

exports.closeOrder = async (req, res) => {
	try {
		const { id } = req.params;
		const { user } = req;
		const result = await ManufacturingService.closeOrder(id, user);
		res.status(200).json(result);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

exports.getOrderById = async (req, res) => {
	try {
		const { id } = req.params;
		const { superUser } = req.user;
		const result = await ManufacturingService.getOrderById(id, superUser);
		if (!result)
			return res.status(404).json({ message: 'Orden no encontrada' });
		res.status(200).json(result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

exports.getList = async (req, res) => {
	try {
		const { page, limit, status } = req.query;
		const { superUser } = req.user;
		const result = await ManufacturingService.getList({
			superUser,
			page: parseInt(page),
			limit: parseInt(limit),
			status,
		});
		res.status(200).json(result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

exports.getCostSnapshot = async (req, res) => {
	try {
		const { id } = req.params;
		const { superUser } = req.user;
		const result = await ManufacturingService.getCostSnapshot(id, superUser);
		res.status(200).json(result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
