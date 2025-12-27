/* eslint-disable no-unreachable */
const { response } = require('express');
const { logger } = require('../../helpers/logger');
const { ObjectId } = require('mongoose').Types;
const { Sale } = require('../../models');

// ganancia y deuda por cliente

const clientTotalPaymentsReport = async (req, res = response) => {
	try {
		const { limit = 10 } = req.query;

		const report = await Sale.aggregate([
			{
				$match: {
					superUser: new ObjectId(req.tenant._id),
					saleDate: {
						$gt: new Date('2023-03-21T03:00:00.000Z'),
					},
				},
			},
			{
				$unwind: '$items',
			},
			{
				$lookup: {
					from: 'users',
					localField: 'user',
					foreignField: '_id',
					as: 'userOrder',
				},
			},
			{
				$lookup: {
					from: 'clients',
					localField: 'customer',
					foreignField: '_id',
					as: 'clientOrder',
				},
			},
			{ $unwind: '$userOrder' },
			{ $unwind: '$clientOrder' },

			{
				$group: {
					_id: {
						userId: '$userOrder._id',
						clientId: '$clientOrder._id',
						name: '$userOrder.name',
						lastName: '$userOrder.lastName',
						active: '$clientOrder.active',
					},
					totalBuy: { $sum: '$items.total' },
					totalCost: { $sum: '$items.totalCost' },
					ordersCount: { $sum: 1 },
				},
			},
			{
				$project: {
					_id: 0,
					userId: '$_id.userId',
					clientId: '$_id.clientId',
					name: '$_id.name',
					lastName: '$_id.lastName',
					active: '$_id.active',

					totalBuy: 1,
					totalCost: 1,
					totalProfits: {
						$subtract: ['$totalBuy', '$totalCost'],
					},
					ordersCount: 1,
				},
			},
			{
				$sort: {
					totalBuy: -1,
				},
			},
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			total: report.length,
			data: {
				active: report
					.filter(
						(client) =>
							client.name !== 'consumidor ' &&
							client.name !== 'Caleb' &&
							client.active
					)
					.sort((a, b) => b.totalProfits - a.totalProfits)
					.slice(0, limit),

				inactive: report
					.filter(
						(client) =>
							client.name !== 'consumidor ' &&
							client.name !== 'Caleb' &&
							!client.active
					)
					.sort((a, b) => b.totalProfits - a.totalProfits)
					.slice(0, limit),
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
const clientTotalDebt = async (req, res = response) => {
	try {
		const report = await Sale.aggregate([
			{
				$match: {
					paid: false,
					superUser: new ObjectId(req.tenant._id),
					'payment.debt': { $gt: 0 },
				},
			},

			// 🔗 Sale → Client
			{
				$lookup: {
					from: 'clients',
					localField: 'customer',
					foreignField: '_id',
					as: 'client',
				},
			},
			{ $unwind: '$client' },

			// 🔗 Client → User
			{
				$lookup: {
					from: 'users',
					localField: 'client.user',
					foreignField: '_id',
					as: 'user',
				},
			},
			{ $unwind: '$user' },

			{
				$group: {
					_id: {
						clientId: '$client._id',
						name: '$user.name',
						lastName: '$user.lastName',
					},
					totalDebt: { $sum: '$payment.debt' },
					totalCash: { $sum: '$payment.cash' },
					totalTransfer: { $sum: '$payment.transfer' },
					totalUnpaidOrders: { $sum: 1 },
				},
			},

			{
				$project: {
					_id: 0,
					clientId: '$_id.clientId',
					name: '$_id.name',
					lastName: '$_id.lastName',
					totalDebt: 1,
					totalCash: 1,
					totalTransfer: 1,
					totalUnpaidOrders: 1,
				},
			},

			{
				$sort: { totalDebt: -1 },
			},
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			total: report.length,
			data: {
				report,
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

module.exports = {
	clientTotalPaymentsReport,
	clientTotalDebt,
};
