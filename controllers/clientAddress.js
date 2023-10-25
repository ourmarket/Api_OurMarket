const { response } = require('express');
const { ClientAddress } = require('../models');
const { getTokenData } = require('../helpers');

const getClientAddresses = async (req, res = response) => {
	try {
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const clientAddress = await ClientAddress.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		})
			.populate('client')
			.populate('user', ['name', 'lastName', 'phone', 'email'])
			.populate('deliveryZone', ['name', 'cost']);

		res.status(200).json({
			ok: true,
			status: 200,
			total: clientAddress.length,
			data: {
				clientAddress,
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

const getClientAddress = async (req, res = response) => {
	try {
		const { id } = req.params;
		const clientAddress = await ClientAddress.findById(id)
			.populate('client')
			.populate('user', ['name', 'lastName', 'phone', 'email'])
			.populate('deliveryZone', ['name']);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				clientAddress,
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

const postClientAddress = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;

		// Generar la data a guardar
		const data = {
			...body,
		};

		const clientAddress = new ClientAddress(data);

		// Guardar DB
		await clientAddress.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				clientAddress,
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

const putClientAddress = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const clientAddress = await ClientAddress.findByIdAndUpdate(id, data, {
			new: true,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				clientAddress,
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

const deleteClientAddress = async (req, res = response) => {
	try {
		const { id } = req.params;
		await ClientAddress.findByIdAndUpdate(id, { state: false }, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
		});
	} catch (error) {
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};
const getUserAddress = async (req, res = response) => {
	try {
		const { id } = req.params;
		const clientAddress = await ClientAddress.find({ user: id, state: true })
			.populate('client')
			.populate('user', ['name', 'lastName', 'phone', 'email'])
			.populate('deliveryZone', ['name', 'cost']);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				clientAddress,
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

module.exports = {
	postClientAddress,
	getClientAddresses,
	getClientAddress,
	putClientAddress,
	deleteClientAddress,
	getUserAddress,
};
