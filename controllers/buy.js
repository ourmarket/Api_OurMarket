const { response } = require('express');
const { Buy, Product } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getBuys = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const buys = await Buy.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		}).populate('supplier', 'businessName');

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
		const buy = await Buy.findById(id);

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

const postBuy = async (req, res = response) => {
	try {
		const { state, products, ...body } = req.body;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		// Generar la data a guardar
		const data = {
			...body,
			products,
			superUser: tokenData.UserInfo.superUser,
		};

		// agregar STOCK

		for (let i = 0; i < products.length; i++) {
			const id = products[i].productId;
			const product = await Product.findById(id);

			const newStock = {
				productId: id,
				name: product.name,
				img: product.img,
				supplier: body.supplier,
				quantity: products[i].quantity,
				cost: products[i].totalCost,
				unityCost: products[i].unitCost,
				stock: products[i].quantity,
				createdStock: new Date(),
				updateStock: new Date(),
				return: false,
			};

			const stock = [...product.stock, newStock];

			await Product.findByIdAndUpdate(id, { stock }, { new: true });
		}

		const buy = new Buy(data);

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

module.exports = {
	getBuys,
	getBuy,
	postBuy,
};
