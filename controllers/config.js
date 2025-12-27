const { response } = require('express');
const { Config, Order, Client } = require('../models');
const { logger } = require('../helpers/logger');
const { ObjectId } = require('mongodb');

const getConfig = async (req, res = response) => {
	try {
		

		const config = await Config.find({
			state: true,
			superUser: req.tenant._id,
		});
		if (config.length === 0) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: `No existe configuración para este usuario`,
			});
		}

		return res.status(200).json({
			ok: true,
			status: 200,
			config: config[0],
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const postConfig = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;
		

		const existConfig = await Config.findOne({
			superUser: req.tenant._id,
			state: true,
		});

		if (existConfig) {
			logger.error({
				msg: `Ya existe una configuración para este usuario`,
			});
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: `Ya existe una configuración para este usuario`,
			});
		}

		// Generar la data a guardar
		const data = {
			...body,
			superUser: req.tenant._id,
		};

		const newConfig = new Config(data);

		// Guardar DB
		await newConfig.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				config: newConfig,
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

const putConfig = async (req, res = response) => {
	try {
		const { inactiveDays } = req.body;

		const data = {
			inactiveDays,
		};

		

		const editConfig = await Config.findOneAndUpdate(
			{ superUser: req.tenant._id },
			data,
			{ new: true }
		);

		return res.status(200).json({
			ok: true,
			status: 200,
			config: editConfig,
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
const setConfigActiveClient = async (req, res = response) => {
	try {
		

		const config = await Config.find({
			superUser: req.tenant._id,
		});

		console.log(
			new Date(
				new Date().setDate(new Date().getDate() - config[0].inactiveDays)
			)
		);

		const lastOrders = await Order.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(req.tenant._id),
					deliveryDate: {
						$gte: new Date(
							new Date().setDate(new Date().getDate() - config[0].inactiveDays)
						),
					},
				},
			},
			{
				$project: {
					client: 1,
					deliveryDate: 1,
				},
			},
		]);

		await Client.updateMany(
			{ superUser: req.tenant._id },
			{ $set: { active: false } }
		);

		lastOrders.forEach(async (order) => {
			await Client.findByIdAndUpdate(order.client, { active: true });
		});

		return res.status(200).json({
			ok: true,
			status: 200,
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
	getConfig,
	postConfig,
	putConfig,
	setConfigActiveClient,
};
