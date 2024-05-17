/* eslint-disable no-dupe-keys */
/* eslint-disable camelcase */
const { response } = require('express');
const { Order } = require('../models');
const { ObjectId } = require('mongodb');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

// productos, total, por mes, por dia >>>>>>>>>>>>>>>>>>>>>> MEJORAR agregando limite de respuesta
const reportTotalOrdersProducts = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Order.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(tokenData.UserInfo.superUser),
				},
			},
			{
				$unwind: {
					path: '$orderItems',
				},
			},
			{
				$project: {
					deliveryDate: 1,
					orderItems: 1,
					CostTotal: {
						$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
					},
				},
			},
			{
				$group: {
					_id: {
						id: '$orderItems.productId',
					},
					count: {
						$sum: '$orderItems.totalQuantity',
					},
					total: {
						$sum: '$orderItems.totalPrice',
					},
					totalCost: {
						$sum: '$CostTotal',
					},
				},
			},
			{
				$lookup: {
					from: 'products',
					localField: '_id.id',
					foreignField: '_id',
					as: 'productOrder',
				},
			},
			{
				$unwind: {
					path: '$productOrder',
				},
			},
			{
				$project: {
					_id: 0,
					productId: '$productOrder._id',
					name: '$productOrder.name',
					img: '$productOrder.img',
					count: 1,
					total: 1,
					totalCost: 1,
					totalProfits: {
						$subtract: ['$total', '$totalCost'],
					},
				},
			},
			{
				$sort: {
					total: -1,
				},
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

const reportTotalOrdersProductsByDay = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Order.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(tokenData.UserInfo.superUser),
				},
			},
			{
				$unwind: {
					path: '$orderItems',
				},
			},
			{
				$project: {
					deliveryDate: 1,
					orderItems: 1,
					CostTotal: {
						$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
					},
				},
			},
			{
				$group: {
					_id: {
						day: {
							$dayOfMonth: '$deliveryDate',
						},
						month: {
							$month: '$deliveryDate',
						},
						year: {
							$year: '$deliveryDate',
						},
						name: '$orderItems.description',
						img: '$orderItems.img',
					},
					count: {
						$sum: '$orderItems.totalQuantity',
					},
					total: {
						$sum: '$orderItems.totalPrice',
					},
					totalCost: {
						$sum: '$CostTotal',
					},
				},
			},
			{
				$project: {
					_id: 0,
					day: {
						$toString: '$_id.day',
					},
					month: {
						$toString: '$_id.month',
					},
					year: {
						$toString: '$_id.year',
					},
					name: '$_id.name',
					img: '$_id.img',
					count: 1,
					total: 1,
					totalCost: 1,
				},
			},
			{
				$project: {
					_id: 0,
					date: {
						$concat: ['$day', '-', '$month', '-', '$year'],
					},
					name: 1,
					img: 1,
					count: 1,
					total: 1,
					totalCost: 1,
					totalProfits: {
						$subtract: ['$total', '$totalCost'],
					},
				},
			},
		]);

		res.status(200).json({
			ok: true,
			status: 200,
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
const reportTotalOrdersProductsByMonth = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Order.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(tokenData.UserInfo.superUser),
				},
			},
			{
				$unwind: {
					path: '$orderItems',
				},
			},
			{
				$group: {
					_id: {
						month: {
							$month: '$deliveryDate',
						},
						year: {
							$year: '$deliveryDate',
						},
						name: '$orderItems.description',
						img: '$orderItems.img',
					},
					count: {
						$sum: '$orderItems.totalQuantity',
					},
				},
			},
			{
				$project: {
					_id: 0,

					month: {
						$toString: '$_id.month',
					},
					year: {
						$toString: '$_id.year',
					},
					name: '$_id.name',
					img: '$_id.img',
					count: 1,
				},
			},
			{
				$project: {
					_id: 0,
					date: {
						$concat: ['$month', '-', '$year'],
					},
					name: 1,
					img: 1,
					count: 1,
				},
			},
		]);

		res.status(200).json({
			ok: true,
			status: 200,
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
const reportTotalOrdersProductsByRange = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const { from, to } = req.body; // "Tue, 21 Mar 2023 00:00:00 GMT"
		const report = await Order.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(tokenData.UserInfo.superUser),
					deliveryDate: {
						$gt: new Date(from),
						$lt: new Date(to),
					},
				},
			},
			{
				$unwind: {
					path: '$orderItems',
				},
			},
			{
				$project: {
					deliveryDate: 1,
					orderItems: 1,
					CostTotal: {
						$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
					},
				},
			},
			{
				$group: {
					_id: {
						name: '$orderItems.description',
						img: '$orderItems.img',
					},
					count: {
						$sum: '$orderItems.totalQuantity',
					},
					total: {
						$sum: '$orderItems.totalPrice',
					},
					totalCost: {
						$sum: '$CostTotal',
					},
				},
			},
			{
				$project: {
					_id: 0,
					name: '$_id.name',
					img: '$_id.img',
					count: 1,
					total: 1,
					totalCost: 1,
					totalProfits: {
						$subtract: ['$total', '$totalCost'],
					},
				},
			},
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			from,
			to,
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
const reportTotalOrdersProductsByRangeTest = async (req, res = response) => {
	try {
		const { from, to } = req.body;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const report = await Order.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(tokenData.UserInfo.superUser),
					deliveryDate: {
						$gt: new Date(from),
						$lt: new Date(to),
					},
				},
			},
			{
				$unwind: {
					path: '$orderItems',
				},
			},
			{
				$project: {
					deliveryDate: 1,
					orderItems: 1,
					CostTotal: {
						$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
					},
				},
			},
			{
				$group: {
					_id: {
						id: '$orderItems.productId',
					},
					count: {
						$sum: '$orderItems.totalQuantity',
					},
					total: {
						$sum: '$orderItems.totalPrice',
					},
					totalCost: {
						$sum: '$CostTotal',
					},
				},
			},
			{
				$lookup: {
					from: 'products',
					localField: '_id.id',
					foreignField: '_id',
					as: 'productOrder',
				},
			},
			{
				$unwind: {
					path: '$productOrder',
				},
			},
			{
				$project: {
					_id: 0,
					productId: '$productOrder._id',
					name: '$productOrder.name',
					img: '$productOrder.img',
					count: 1,
					total: 1,
					totalCost: 1,
					totalProfits: {
						$subtract: ['$total', '$totalCost'],
					},
				},
			},
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			from,
			to,
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
const reportTotalIndividualProduct = async (req, res = response) => {
	const { id } = req.params;
	const { client } = req.query;
	const jwt =
		req.cookies.jwt_dashboard ||
		req.cookies.jwt_tpv ||
		req.cookies.jwt_deliveryApp;
	const tokenData = getTokenData(jwt);

	try {
		let totals;
		let byMonth;
		if (client) {
			totals = await Order.aggregate([
				{
					$match: {
						state: true,
						client: new ObjectId(client),
						superUser: new ObjectId(tokenData.UserInfo.superUser),
						deliveryDate: {
							$gt: new Date('Tue, 21 Mar 2023 03:00:00 GMT'),
						},
					},
				},
				{
					$unwind: {
						path: '$orderItems',
					},
				},
				{
					$project: {
						deliveryDate: 1,
						orderItems: 1,
						CostTotal: {
							$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
						},
					},
				},
				{
					$group: {
						_id: {
							id: '$orderItems.productId',
						},
						count: {
							$sum: '$orderItems.totalQuantity',
						},
						total: {
							$sum: '$orderItems.totalPrice',
						},
						totalCost: {
							$sum: '$CostTotal',
						},
					},
				},
				{
					$lookup: {
						from: 'products',
						localField: '_id.id',
						foreignField: '_id',
						as: 'productOrder',
					},
				},
				{
					$unwind: {
						path: '$productOrder',
					},
				},
				{
					$project: {
						_id: 0,
						productId: '$productOrder._id',
						name: '$productOrder.name',
						img: '$productOrder.img',
						count: 1,
						total: 1,
						totalCost: 1,
						totalProfits: {
							$subtract: ['$total', '$totalCost'],
						},
					},
				},
				{
					$sort: {
						totalProfits: -1,
					},
				},
				{
					$match: {
						productId: new ObjectId(id),
					},
				},
			]);
			byMonth = await Order.aggregate([
				{
					$match: {
						state: true,
						client: new ObjectId(client),
						superUser: new ObjectId(tokenData.UserInfo.superUser),
						deliveryDate: {
							$gt: new Date('Tue, 21 Mar 2023 03:00:00 GMT'),
						},
					},
				},
				{
					$unwind: {
						path: '$orderItems',
					},
				},
				{
					$project: {
						deliveryDate: 1,
						orderItems: 1,
						CostTotal: {
							$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
						},
					},
				},
				{
					$group: {
						_id: {
							id: '$orderItems.productId',
							month: {
								$month: '$deliveryDate',
							},
							year: {
								$year: '$deliveryDate',
							},
						},
						count: {
							$sum: '$orderItems.totalQuantity',
						},
						total: {
							$sum: '$orderItems.totalPrice',
						},
						totalCost: {
							$sum: '$CostTotal',
						},
					},
				},
				{
					$lookup: {
						from: 'products',
						localField: '_id.id',
						foreignField: '_id',
						as: 'productOrder',
					},
				},
				{
					$unwind: {
						path: '$productOrder',
					},
				},
				{
					$project: {
						_id: 0,
						month: '$_id.month',
						year: '$_id.year',
						productId: '$productOrder._id',
						name: '$productOrder.name',
						img: '$productOrder.img',
						count: 1,
						total: 1,
						totalCost: 1,
						totalProfits: {
							$subtract: ['$total', '$totalCost'],
						},
					},
				},
				{
					$sort: {
						month: 1,
					},
				},
				{
					$match: {
						productId: new ObjectId(id),
					},
				},
			]);
		} else {
			totals = await Order.aggregate([
				{
					$match: {
						state: true,
						superUser: new ObjectId(tokenData.UserInfo.superUser),
						deliveryDate: {
							$gt: new Date('Tue, 21 Mar 2023 03:00:00 GMT'),
						},
					},
				},
				{
					$unwind: {
						path: '$orderItems',
					},
				},
				{
					$project: {
						deliveryDate: 1,
						orderItems: 1,
						CostTotal: {
							$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
						},
					},
				},
				{
					$group: {
						_id: {
							id: '$orderItems.productId',
						},
						count: {
							$sum: '$orderItems.totalQuantity',
						},
						total: {
							$sum: '$orderItems.totalPrice',
						},
						totalCost: {
							$sum: '$CostTotal',
						},
					},
				},
				{
					$lookup: {
						from: 'products',
						localField: '_id.id',
						foreignField: '_id',
						as: 'productOrder',
					},
				},
				{
					$unwind: {
						path: '$productOrder',
					},
				},
				{
					$project: {
						_id: 0,
						productId: '$productOrder._id',
						name: '$productOrder.name',
						img: '$productOrder.img',
						count: 1,
						total: 1,
						totalCost: 1,
						totalProfits: {
							$subtract: ['$total', '$totalCost'],
						},
					},
				},
				{
					$sort: {
						totalProfits: -1,
					},
				},
				{
					$match: {
						productId: new ObjectId(id),
					},
				},
			]);
			byMonth = await Order.aggregate([
				{
					$match: {
						state: true,
						superUser: new ObjectId(tokenData.UserInfo.superUser),
						deliveryDate: {
							$gt: new Date('Tue, 21 Mar 2023 03:00:00 GMT'),
						},
					},
				},
				{
					$unwind: {
						path: '$orderItems',
					},
				},
				{
					$project: {
						deliveryDate: 1,
						orderItems: 1,
						CostTotal: {
							$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
						},
					},
				},
				{
					$group: {
						_id: {
							id: '$orderItems.productId',
							month: {
								$month: '$deliveryDate',
							},
							year: {
								$year: '$deliveryDate',
							},
						},
						count: {
							$sum: '$orderItems.totalQuantity',
						},
						total: {
							$sum: '$orderItems.totalPrice',
						},
						totalCost: {
							$sum: '$CostTotal',
						},
					},
				},
				{
					$lookup: {
						from: 'products',
						localField: '_id.id',
						foreignField: '_id',
						as: 'productOrder',
					},
				},
				{
					$unwind: {
						path: '$productOrder',
					},
				},
				{
					$project: {
						_id: 0,
						month: '$_id.month',
						year: '$_id.year',
						productId: '$productOrder._id',
						name: '$productOrder.name',
						img: '$productOrder.img',
						count: 1,
						total: 1,
						totalCost: 1,
						totalProfits: {
							$subtract: ['$total', '$totalCost'],
						},
					},
				},
				{
					$sort: {
						month: 1,
					},
				},
				{
					$match: {
						productId: new ObjectId(id),
					},
				},
			]);
		}

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				report: totals,
				byMonth,
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
const reportTotalIndividualProductLast30days = async (req, res = response) => {
	const { id } = req.params;
	const { client } = req.query;

	try {
		let report;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		if (client) {
			report = await Order.aggregate([
				{
					$match: {
						state: true,
						client: new ObjectId(client),
						superUser: new ObjectId(tokenData.UserInfo.superUser),
						deliveryDate: {
							$gte: new Date(new Date().setDate(new Date().getDate() - 30)),
						},
					},
				},
				{
					$unwind: {
						path: '$orderItems',
					},
				},
				{
					$project: {
						deliveryDate: 1,
						orderItems: 1,
						CostTotal: {
							$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
						},
					},
				},
				{
					$group: {
						_id: {
							id: '$orderItems.productId',
						},
						count: {
							$sum: '$orderItems.totalQuantity',
						},
						total: {
							$sum: '$orderItems.totalPrice',
						},
						totalCost: {
							$sum: '$CostTotal',
						},
					},
				},
				{
					$lookup: {
						from: 'products',
						localField: '_id.id',
						foreignField: '_id',
						as: 'productOrder',
					},
				},
				{
					$unwind: {
						path: '$productOrder',
					},
				},
				{
					$project: {
						_id: 0,
						productId: '$productOrder._id',
						name: '$productOrder.name',
						img: '$productOrder.img',
						count: 1,
						total: 1,
						totalCost: 1,
						totalProfits: {
							$subtract: ['$total', '$totalCost'],
						},
					},
				},
				{
					$sort: {
						totalProfits: -1,
					},
				},
				{
					$match: {
						productId: new ObjectId(id),
					},
				},
			]);
		} else {
			report = await Order.aggregate([
				{
					$match: {
						state: true,
						superUser: new ObjectId(tokenData.UserInfo.superUser),
						deliveryDate: {
							$gte: new Date(new Date().setDate(new Date().getDate() - 30)),
						},
					},
				},
				{
					$unwind: {
						path: '$orderItems',
					},
				},
				{
					$project: {
						deliveryDate: 1,
						orderItems: 1,
						CostTotal: {
							$multiply: ['$orderItems.totalQuantity', '$orderItems.unitCost'],
						},
					},
				},
				{
					$group: {
						_id: {
							id: '$orderItems.productId',
						},
						count: {
							$sum: '$orderItems.totalQuantity',
						},
						total: {
							$sum: '$orderItems.totalPrice',
						},
						totalCost: {
							$sum: '$CostTotal',
						},
					},
				},
				{
					$lookup: {
						from: 'products',
						localField: '_id.id',
						foreignField: '_id',
						as: 'productOrder',
					},
				},
				{
					$unwind: {
						path: '$productOrder',
					},
				},
				{
					$project: {
						_id: 0,
						productId: '$productOrder._id',
						name: '$productOrder.name',
						img: '$productOrder.img',
						count: 1,
						total: 1,
						totalCost: 1,
						totalProfits: {
							$subtract: ['$total', '$totalCost'],
						},
					},
				},
				{
					$sort: {
						totalProfits: -1,
					},
				},
				{
					$match: {
						productId: new ObjectId(id),
					},
				},
			]);
		}

		res.status(200).json({
			ok: true,
			status: 200,
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
	reportTotalOrdersProducts,
	reportTotalOrdersProductsByDay,
	reportTotalOrdersProductsByMonth,
	reportTotalOrdersProductsByRange,
	reportTotalOrdersProductsByRangeTest,
	reportTotalIndividualProduct,
	reportTotalIndividualProductLast30days,
};
