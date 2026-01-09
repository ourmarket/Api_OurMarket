const BillOfMaterialsService = require('../services/billOfMaterials.service');

const create = async (req, res) => {
	try {
		const { user } = req;
		const data = { ...req.body, superUser: user.superUser };
		const result = await BillOfMaterialsService.create(data);
		res.status(201).json(result);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

const update = async (req, res) => {
	try {
		const { id } = req.params;
		const { user } = req;
		const result = await BillOfMaterialsService.update(
			id,
			req.body,
			user.superUser
		);
		res.json(result);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

const getList = async (req, res) => {
	try {
		const { page, limit, search } = req.query;
		const { user } = req;
		const result = await BillOfMaterialsService.getList({
			superUser: user.superUser,
			page: parseInt(page),
			limit: parseInt(limit),
			search,
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
		const result = await BillOfMaterialsService.getById(id, user.superUser);
		res.json(result);
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const toggleActive = async (req, res) => {
	try {
		const { id } = req.params;
		const { user } = req;
		const result = await BillOfMaterialsService.toggleActive(
			id,
			user.superUser
		);
		res.json(result);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

const getActiveRecipes = async (req, res) => {
	try {
		const { user } = req;
		const result = await BillOfMaterialsService.getActiveRecipes(
			user.superUser
		);
		res.json(result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

module.exports = {
	create,
	update,
	getList,
	getById,
	toggleActive,
	getActiveRecipes,
};
