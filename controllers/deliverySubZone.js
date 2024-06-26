const { response } = require('express');
const { DeliverySubZone } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getDeliverySubZones = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const deliverySubZones = await DeliverySubZone.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		})
			.populate('deliveryZone', ['name'])
			.sort({ name: -1 });

		res.status(200).json({
			ok: true,
			status: 200,
			total: deliverySubZones.length,
			data: {
				deliverySubZones,
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

const getDeliverySubZone = async (req, res = response) => {
	try {
		const { id } = req.params;
		const deliverySubZone = await DeliverySubZone.findById(id).populate(
			'deliveryZone',
			['name']
		);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				deliverySubZone,
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

const postDeliverySubZone = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const deliverySubZoneDB = await DeliverySubZone.findOne({
			name: body.name,
		});

		if (deliverySubZoneDB) {
			return res.status(400).json({
				msg: `La zona ${deliverySubZoneDB.name}, ya existe`,
			});
		}

		// Generar la data a guardar
		const data = {
			...body,
			superUser: tokenData.UserInfo.superUser,
		};

		const deliverySubZone = new DeliverySubZone(data);

		// Guardar DB
		await deliverySubZone.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				deliverySubZone,
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

const putDeliverySubZone = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const deliverySubZone = await DeliverySubZone.findByIdAndUpdate(id, data, {
			new: true,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				deliverySubZone,
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

const deleteDeliverySubZone = async (req, res = response) => {
	try {
		const { id } = req.params;
		await DeliverySubZone.findByIdAndUpdate(
			id,
			{ state: false },
			{ new: true }
		);

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
	postDeliverySubZone,
	getDeliverySubZones,
	getDeliverySubZone,
	putDeliverySubZone,
	deleteDeliverySubZone,
};
