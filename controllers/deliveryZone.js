const { response } = require('express');
const { DeliveryZone } = require('../models');
const { getTokenData } = require('../helpers');
const { ObjectId } = require('mongodb');
const { logger } = require('../helpers/logger');

const getDeliveryZones = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const deliveryZones = await DeliveryZone.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			total: deliveryZones.length,
			data: {
				deliveryZones,
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

const getDeliveryZone = async (req, res = response) => {
	try {
		const { id } = req.params;
		const deliveryZone = await DeliveryZone.findById(id);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				deliveryZone,
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

const postDeliveryZone = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const deliveryZoneDB = await DeliveryZone.findOne({
			name: body.name,
			superUser: tokenData.UserInfo.superUser,
		});

		if (deliveryZoneDB) {
			logger.error({
				msg: `La zona ${deliveryZoneDB.name}, ya existe`,
			});
			return res.status(400).json({
				msg: `La zona ${deliveryZoneDB.name}, ya existe`,
			});
		}

		// Generar la data a guardar
		const data = {
			...body,
			superUser: tokenData.UserInfo.superUser,
		};

		const deliveryZone = new DeliveryZone(data);

		// Guardar DB
		await deliveryZone.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				deliveryZone,
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

const putDeliveryZone = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const deliveryZone = await DeliveryZone.findByIdAndUpdate(id, data, {
			new: true,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				deliveryZone,
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
const putDeleteMapZone = async (req, res = response) => {
	try {
		const { id } = req.params;

		await DeliveryZone.updateOne(
			{ _id: ObjectId(id) },
			{ $unset: { mapLimits: '' } }
		);

		res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Dibujo de zona borrado con éxito',
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

const deleteDeliveryZone = async (req, res = response) => {
	try {
		const { id } = req.params;
		await DeliveryZone.findByIdAndUpdate(id, { state: false }, { new: true });

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
	postDeliveryZone,
	getDeliveryZones,
	getDeliveryZone,
	putDeliveryZone,
	deleteDeliveryZone,
	putDeleteMapZone,
};
