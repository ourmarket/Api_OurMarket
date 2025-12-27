
const { logger } = require('../helpers/logger');
const { Points, Client } = require('../models');
const { response } = require('express');

const getAllPoints = async (req, res = response) => {
	try {
		
		const { limit = 100000, from = 0 } = req.query;
		const query = { state: true, superUser: req.tenant._id };

		const [total, points] = await Promise.all([
			Points.countDocuments(query),
			Points.find(query)
				.skip(Number(from))
				.limit(Number(limit))
				.populate('clientId'),
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			total,
			data: {
				points,
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

const getAllPointsByClient = async (req, res = response) => {
	try {
		const { id } = req.params;
		const points = await Points.find({ state: true, clientId: id });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				points,
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
const postPoints = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;

		

		// Generar la data a guardar
		const data = {
			...body,
			superUser: req.tenant._id,
		};

		const points = new Points(data);

		// Guardar DB
		await points.save();

		// actualizo puntos dentro de cliente
		const pointsData = await Points.find({
			state: true,
			clientId: body.clientId,
		});
		const totalPoints = pointsData.reduce((acc, curr) => acc + curr.points, 0);
		console.log(totalPoints);
		const id = body.clientId;
		await Client.findByIdAndUpdate(id, { points: totalPoints });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				points,
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
const putPoints = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const points = await Points.findByIdAndUpdate(id, data, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				points,
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
const deletePoints = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Points.findByIdAndUpdate(id, { state: false }, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Puntos borrados',
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
const resetPoints = async (req, res = response) => {
	try {
		

		await Points.updateMany(
			{ state: true, superUser: req.tenant._id },
			{ state: false },
			{ new: true }
		);
		await Client.updateMany(
			{ state: true, superUser: req.tenant._id },
			{ points: 0 },
			{ new: true }
		);

		res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Puntos reseteados',
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
	getAllPoints,
	getAllPointsByClient,
	postPoints,
	putPoints,
	deletePoints,
	resetPoints,
};
