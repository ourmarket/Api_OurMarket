const { response } = require('express');
const { Expenses } = require('../models');

const { logger } = require('../helpers/logger');

const getAllExpenses = async (req, res = response) => {
	try {
		

		const expenses = await Expenses.find({
			state: true,
			superUser: req.tenant._id,
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
		

		// Generar la data a guardar
		const data = {
			...body,
			superUser: req.tenant._id,
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
