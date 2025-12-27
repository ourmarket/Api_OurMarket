const { response } = require('express');
const { CashierSession, Order } = require('../models');
const { logger } = require('../helpers/logger');

const getCashierSessions = async (req, res = response) => {
	try {
		const sessions = await CashierSession.find({
			state: true,
			superUser: req.tenant._id,
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
			'email',
			'phone',
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

		// Generar la data a guardar
		const data = {
			...body,
			superUser: req.tenant._id,
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
			let session = null;
			const findSession = await CashierSession.findById(id);

			const findOrder = findSession.localOrder.find(
				(order) => order === newOrderId
			);

			if (!findOrder) {
				const addOrderData = {
					localOrder: [...findSession.localOrder, newOrderId],
				};

				session = await CashierSession.findByIdAndUpdate(id, addOrderData, {
					new: true,
				});
			}

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
