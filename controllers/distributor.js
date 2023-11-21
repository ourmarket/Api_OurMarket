const { response } = require('express');
const { Distributor } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getDistributors = async (req, res = response) => {
	try {
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const distributors = await Distributor.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			total: distributors.length,
			data: {
				distributors,
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

const getDistributor = async (req, res = response) => {
	try {
		const { id } = req.params;
		const distributor = await Distributor.findById(id);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				distributor,
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

const postDistributor = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const distributorDB = await Distributor.findOne({
			businessName: body.businessName,
		});

		if (distributorDB) {
			return res.status(400).json({
				msg: `El distribuidor ${distributorDB.businessName}, ya existe`,
			});
		}

		// Generar la data a guardar
		const data = {
			...body,
			superUser: tokenData.UserInfo.superUser,
		};

		const distributor = new Distributor(data);

		// Guardar DB
		await distributor.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				distributor,
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

const putDistributor = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const distributor = await Distributor.findByIdAndUpdate(id, data, {
			new: true,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				distributor,
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

const deleteDistributor = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Distributor.findByIdAndUpdate(id, { state: false }, { new: true });

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
	postDistributor,
	getDistributors,
	getDistributor,
	putDistributor,
	deleteDistributor,
};
