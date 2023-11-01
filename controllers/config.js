const { response } = require('express');
const { Config, Order, Client } = require('../models');
const { getTokenData } = require('../helpers');

const getConfig = async (req, res = response) => {
	try {
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const config = await Config.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
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
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const existConfig = await Config.findOne({
			superUser: tokenData.UserInfo.superUser,
			state: true,
		});

		if (existConfig) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: `Ya existe una configuración para este usuario`,
			});
		}

		// Generar la data a guardar
		const data = {
			...body,
			superUser: tokenData.UserInfo.superUser,
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

		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const editConfig = await Config.findOneAndUpdate(
			{ superUser: tokenData.UserInfo.superUser },
			data,
			{ new: true }
		);

		return res.status(200).json({
			ok: true,
			status: 200,
			config: editConfig,
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};
const setConfigActiveClient = async (req, res = response) => {
	try {
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const config = await Config.find({
			superUser: tokenData.UserInfo.superUser,
		});
		const lastOrders = await Order.aggregate([
			{
				$match: {
					state: true,
					superUser: tokenData.UserInfo.superUser,
					deliveryDate: {
						$gte: new Date(
							new Date().setDate(new Date().getDate() - config.inactiveDays)
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
			{ superUser: tokenData.UserInfo.superUser },
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
