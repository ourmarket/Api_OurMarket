/* eslint-disable no-unreachable */
const { response } = require('express');
const { Order } = require('../../models');
const { getTokenData } = require('../../helpers');
const { logger } = require('../../helpers/logger');
const { ObjectId } = require('mongoose').Types;

// ganancia y deuda por cliente

const totalPaymentByClientReport = async (req, res = response) => {
	try {
		const { limit } = req.query;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Order.aggregate([
			{
				$match: {
					state: true,
					status: 'Entregado',
					superUser: new ObjectId(tokenData.UserInfo.superUser),
					deliveryDate: {
						$gt: new Date('Tue, 21 Mar 2023 03:00:00 GMT'),
					},
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'userId',
					foreignField: '_id',
					as: 'userOrder',
				},
			},
			{
				$lookup: {
					from: 'clients',
					localField: 'client',
					foreignField: '_id',
					as: 'clientOrder',
				},
			},
			{
				$unwind: {
					path: '$orderItems',
				},
			},
			{
				$unwind: {
					path: '$clientOrder',
				},
			},
			{
				$unwind: {
					path: '$userOrder',
				},
			},
			{
				$project: {
					_id: 0,

					client: 1,
					userId: '$userOrder._id',
					clientId: '$client',
					name: '$userOrder.name',
					lastName: '$userOrder.lastName',
					totalBuy: '$orderItems.totalPrice',

					active: '$clientOrder.active',
					totalCost: {
						$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
					},
				},
			},
			{
				$project: {
					active: 1,
					client: 1,
					userId: 1,
					name: 1,
					lastName: 1,

					totalBuy: 1,
					totalCost: 1,
					totalProfits: {
						$subtract: ['$totalBuy', '$totalCost'],
					},
				},
			},
			{
				$group: {
					_id: {
						userId: '$userId',
						clientId: '$client',
						name: '$name',
						lastName: '$lastName',
						active: '$active',
					},
					totalCost: {
						$sum: '$totalCost',
					},
					totalBuy: {
						$sum: '$totalBuy',
					},
					totalProfits: {
						$sum: '$totalProfits',
					},
					ordersCount: {
						$sum: 1, // Contar órdenes por cliente
					},
				},
			},
			{
				$project: {
					_id: 0,
					totalBuy: 1,
					totalCost: 1,
					totalProfits: 1,
					name: '$_id.name',
					lastName: '$_id.lastName',
					userId: '$_id.userId',
					clientId: '$_id.clientId',
					active: '$_id.active',
					ordersCount: 1, // Incluir la cantidad de órdenes por cliente
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
					.slice(0, limit)
					.sort((a, b) => b.totalProfits - a.totalProfits),
				inactive: report
					.filter(
						(client) =>
							client.name !== 'consumidor ' &&
							client.name !== 'Caleb' &&
							!client.active
					)
					.slice(0, limit)
					.sort((a, b) => b.totalProfits - a.totalProfits),
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
	totalPaymentByClientReport,
};
