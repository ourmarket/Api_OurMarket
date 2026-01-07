const { response } = require('express');
const { Buy, Stock } = require('../models');
const { logger } = require('../helpers/logger');

const getBuys = async (req, res = response) => {
	try {
		const buys = await Buy.find({
			state: true,
			superUser: req.tenant._id,
		})
			.populate('supplier', 'businessName')
			.sort({ createdAt: -1 });

		res.status(200).json({
			ok: true,
			status: 200,
			total: buys.length,
			data: {
				buys,
			},
		});
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const getBuy = async (req, res = response) => {
	try {
		const { id } = req.params;
		const buy = await Buy.findById(id)
			.populate('supplier', 'businessName')
			.populate('createdBy', ['name', 'lastName', 'phone', 'email'])
			.populate('history.performedBy', ['name', 'lastName']);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				buy,
			},
		});
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

// ✔
const postBuy = async (req, res = response) => {
	try {
		const { state, products, ...body } = req.body;

		// Generar la data a guardar
		const data = {
			...body,
			products,
			superUser: req.tenant._id,
			createdBy: req.user._id,
		};

		const buy = new Buy(data);

		// Registrar creación en el historial
		buy.history.push({
			action: 'CREATED',
			description: `Compra creada con código ${buy.code}`,
			performedBy: req.user._id,
		});

		// agregar STOCK

		for (let i = 0; i < products.length; i++) {
			const id = products[i].productId;

			const newStock = {
				stockId: products[i].stockId,
				buy: buy._id,
				product: id,
				quantity: products[i].quantity,
				cost: products[i].totalCost,
				unityCost: products[i].unitCost,
				stock: products[i].quantity,
				createdStock: new Date(),
				updateStock: null,
				superUser: req.tenant._id,
			};
			const stock = new Stock(newStock);
			// Guardar DB

			await stock.save();
		}

		// Guardar DB
		await buy.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				buy,
			},
		});
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

// ✔
const putBuy = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const buy = await Buy.findByIdAndUpdate(id, data, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				buy,
			},
		});
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

// ✔
const deleteBuy = async (req, res = response) => {
	try {
		const { id } = req.params;

		const buy = id;

		await Buy.findByIdAndUpdate(id, { state: false }, { new: true });
		await Stock.findOneAndUpdate(buy, { state: false }, { new: true });

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Compra y stock borrado',
		});
	} catch (error) {
		logger.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

module.exports = {
	getBuys,
	getBuy,
	postBuy,
	putBuy,
	deleteBuy,
};
