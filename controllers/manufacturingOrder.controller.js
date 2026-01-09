const ManufacturingService = require('../services/manufacturing.service');

const createOrder = async (req, res) => {
	try {
		const { user } = req;
		const data = {
			...req.body,
			createdBy: user._id,
			superUser: user.superUser,
		};
		const result = await ManufacturingService.createOrder(data);
		res.status(201).json(result);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

const executeOrder = async (req, res) => {
	try {
		const { id } = req.params;
		const { user } = req;
		// user needs to include superUser and _id, which usually does in req.user from auth middleware
		const result = await ManufacturingService.executeOrder(id, user);
		res.json(result);
	} catch (error) {
		console.error(error);
		res.status(400).json({ message: error.message });
	}
};

const getList = async (req, res) => {
	try {
		const { page, limit, status } = req.query;
		const { user } = req;
		const result = await ManufacturingService.getList({
			superUser: user.superUser,
			page: parseInt(page),
			limit: parseInt(limit),
			status,
		});
		res.json(result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const getById = async (req, res) => {
	try {
		const { id } = req.params;
		const { user } = req;
		const result = await ManufacturingService.getOrderById(id, user.superUser);
		if (!result) return res.status(404).json({ message: 'Order not found' });
		res.json(result);
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const getCostSnapshot = async (req, res) => {
	try {
		const { id } = req.params;
		const { user } = req;
		const result = await ManufacturingService.getCostSnapshot(
			id,
			user.superUser
		);
		res.json(result);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

const closeOrder = async (req, res) => {
	try {
		const { id } = req.params;
		const { user } = req;
		const result = await ManufacturingService.closeOrder(id, user);
		res.json(result);
	} catch (error) {
		console.error(error);
		res.status(400).json({ message: error.message });
	}
};

module.exports = {
	createOrder,
	executeOrder,
	closeOrder,
	getList,
	getById,
	getCostSnapshot,
};
