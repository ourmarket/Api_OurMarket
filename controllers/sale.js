const { response } = require('express');
const { Sale } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getSales = async (req, res = response) => {
	try {
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);
		const { limit = 1000, from = 0 } = req.query;
		const query = { state: true, superUser: tokenData.UserInfo.superUser };

		const [total, sales] = await Promise.all([
			Sale.countDocuments(query),
			Sale.find(query).skip(Number(from)).limit(Number(limit)),
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			total,
			data: {
				sales,
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

const getSale = async (req, res = response) => {
	try {
		const { id } = req.params;
		const sale = await Sale.findById(id);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				sale,
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

const postSale = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		// Generar la data a guardar
		const data = {
			...body,
			superUser: tokenData.UserInfo.superUser,
		};

		const sale = new Sale(data);

		// Guardar DB
		await sale.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				sale,
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

const putSale = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const sale = await Sale.findByIdAndUpdate(id, data, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				sale,
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

const deleteSale = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Sale.findByIdAndUpdate(id, { state: false }, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
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
	postSale,
	getSales,
	getSale,
	putSale,
	deleteSale,
};
