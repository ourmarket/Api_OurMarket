const { response } = require('express');
const { Expenses } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getAllExpenses = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const expenses = await Expenses.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		});

		return res.status(200).json({
			ok: true,
			status: 200,
			total: expenses.length,
			data: {
				expenses,
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

const getExpenses = async (req, res = response) => {
	try {
		const { id } = req.params;
		const expenses = await Expenses.findById(id);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				expenses,
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

const postExpenses = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		// Generar la data a guardar
		const data = {
			...body,
			superUser: tokenData.UserInfo.superUser,
		};

		const expenses = new Expenses(data);

		// Guardar DB
		await expenses.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				expenses,
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

const putExpenses = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const expenses = await Expenses.findByIdAndUpdate(id, data, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				expenses,
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

const deleteExpenses = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Expenses.findByIdAndUpdate(id, { state: false }, { new: true });

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
	postExpenses,
	getAllExpenses,
	getExpenses,
	putExpenses,
	deleteExpenses,
};
