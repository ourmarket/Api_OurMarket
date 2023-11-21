const { response } = require('express');
const { CashierSession, Order } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getCashierSessions = async (req, res = response) => {
	try {
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const sessions = await CashierSession.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		})
			.populate('role', 'role')
			.populate('user', ['name', 'lastName', 'phone', 'email'])
			.sort({ initDate: -1 });

		res.status(200).json({
			ok: true,
			status: 200,
			total: sessions.length,
			data: {
				sessions,
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

const getCashierSession = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { orders = '' } = req.query;
		const session = await CashierSession.findById(id).populate('user', [
			'name',
			'lastName',
		]);

		if (orders === 'all') {
			const allOrders = [];
			for (const order of session.localOrder) {
				const dataOrder = await Order.findById(order);
				allOrders.push(dataOrder);
			}

			return res.status(200).json({
				ok: true,
				status: 200,
				data: {
					session,
					orders: allOrders,
				},
			});
		}

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				session,
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

const postCashierSession = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;

		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		// Generar la data a guardar
		const data = {
			...body,
			superUser: tokenData.UserInfo.superUser,
		};

		const session = new CashierSession(data);

		// Guardar DB
		await session.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				session,
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

const putCashierSession = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, newOrderId, ...data } = req.body;

		if (newOrderId) {
			const findSession = await CashierSession.findById(id);

			const addOrderData = {
				localOrder: [...findSession.localOrder, newOrderId],
			};

			const session = await CashierSession.findByIdAndUpdate(id, addOrderData, {
				new: true,
			});

			return res.status(200).json({
				ok: true,
				status: 200,
				data: {
					session,
				},
			});
		}

		const session = await CashierSession.findByIdAndUpdate(id, data, {
			new: true,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				session,
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

const deleteCashierSession = async (req, res = response) => {
	try {
		const { id } = req.params;
		await CashierSession.findByIdAndUpdate(id, { state: false }, { new: true });

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
	getCashierSessions,
	getCashierSession,
	postCashierSession,
	putCashierSession,
	deleteCashierSession,
};
