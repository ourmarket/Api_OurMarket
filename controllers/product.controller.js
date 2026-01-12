/* eslint-disable eqeqeq */
const { response } = require('express');
const { Product, Sale } = require('../models');
const { logger } = require('../helpers/logger');
const { ObjectId } = require('mongodb');

const getProducts = async (req, res = response) => {
	try {
		const { limit = 100000, from = 0, includeCost = 'false' } = req.query;
		const query = { state: true, superUser: req.tenant._id };

		let total;
		let products;

		if (includeCost === 'true') {
			// Usamos agregación para traer el último costo de ProductLot
			products = await Product.aggregate([
				{ $match: query },
				{ $sort: { name: 1 } },
				{ $skip: Number(from) },
				{ $limit: Number(limit) },
				{
					$lookup: {
						from: 'productlots',
						let: { productId: '$_id' },
						pipeline: [
							{ $match: { $expr: { $eq: ['$product', '$$productId'] } } },
							{ $sort: { createdAt: -1 } },
							{ $limit: 1 },
						],
						as: 'latestLot',
					},
				},
				{
					$addFields: {
						cost: {
							$ifNull: [
								{ $arrayElemAt: ['$latestLot.unitCost', 0] },
								'$cost', // fallback al costo base del modelo
							],
						},
					},
				},
				{
					$lookup: {
						from: 'categories',
						localField: 'category',
						foreignField: '_id',
						as: 'category',
					},
				},
				{
					$unwind: {
						path: '$category',
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$project: {
						latestLot: 0,
						__v: 0,
					},
				},
			]);
			total = await Product.countDocuments(query);
		} else {
			[total, products] = await Promise.all([
				Product.countDocuments(query),
				Product.find(query)
					.populate('category', 'name')
					.skip(Number(from))
					.limit(Number(limit))
					.sort({ name: 1 }),
			]);
		}

		return res.status(200).json({
			ok: true,
			status: 200,
			total,
			products,
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

const getProduct = async (req, res = response) => {
	try {
		const { id } = req.params;
		//
		const product = await Product.findById(id)
			.populate('createdBy', 'name lastName') // Trae solo nombre y apellido del creador
			.populate('lastUpdatedBy', 'name lastName') // Trae solo nombre y apellido del editor
			.populate('category', 'name');

		res.json(product);
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const ProductService = require('../services/product.service');

const postProduct = async (req, res = response) => {
	try {
		const product = await ProductService.createProduct(
			req.body,
			req.user._id,
			req.tenant._id
		);
		res.status(200).json(product);
	} catch (error) {
		logger.error(error);
		res.status(400).json({
			ok: false,
			status: 400,
			msg: error.message,
		});
	}
};

const putProduct = async (req, res = response) => {
	try {
		const { id } = req.params;
		const product = await ProductService.updateProduct(
			id,
			req.body,
			req.user._id,
			req.tenant._id
		);
		res.json(product);
	} catch (error) {
		logger.error(error);
		res.status(400).json({
			ok: false,
			status: 400,
			msg: error.message,
		});
	}
};

const getProductHistory = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { page, limit } = req.query;
		const history = await ProductService.getProductHistory(
			id,
			req.tenant._id,
			parseInt(page) || 1,
			parseInt(limit) || 20
		);
		res.json(history);
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const deleteProduct = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Product.findByIdAndUpdate(id, { state: false }, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Producto borrado ',
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

	try {
		const baseMatch = {
			/*  state: true, */
			superUser: new ObjectId(req.tenant._id),
			saleDate: {
				$gte: new Date('sale'),
			},
		};

		if (client) {
			baseMatch.customer = new ObjectId(client);
		}

		const basePipeline = [
			{ $match: baseMatch },
			{ $unwind: '$items' },
			{
				$match: {
					'items.product': new ObjectId(id),
				},
			},
		];

		console.log(basePipeline);

		/* =============================
		 * TOTAL GENERAL DEL PRODUCTO
		 * ============================= */
		const totals = await Sale.aggregate([
			...basePipeline,
			{
				$group: {
					_id: '$items.product',
					count: { $sum: '$items.quantity' },
					total: { $sum: '$items.total' },
					totalCost: { $sum: '$items.totalCost' },
				},
			},
			{
				$project: {
					_id: 0,
					productId: '$_id',
					count: 1,
					total: 1,
					totalCost: 1,
					totalProfits: {
						$subtract: ['$total', '$totalCost'],
					},
				},
			},
		]);

		/* =============================
		 * AGRUPADO POR MES
		 * ============================= */
		const byMonth = await Sale.aggregate([
			...basePipeline,
			{
				$group: {
					_id: {
						year: { $year: '$saleDate' },
						month: { $month: '$saleDate' },
					},
					count: { $sum: '$items.quantity' },
					total: { $sum: '$items.total' },
					totalCost: { $sum: '$items.totalCost' },
				},
			},
			{
				$project: {
					_id: 0,
					year: '$_id.year',
					month: '$_id.month',
					count: 1,
					total: 1,
					totalCost: 1,
					totalProfits: {
						$subtract: ['$total', '$totalCost'],
					},
				},
			},
			{ $sort: { year: 1, month: 1 } },
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				report: totals[0] || null,
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
	const { customer } = req.query;

	try {
		let report;

		/**
		 * Fecha desde (últimos 30 días)
		 */
		const fromDate = new Date();
		fromDate.setDate(fromDate.getDate() - 30);

		/**
		 * Match base contable
		 */
		const baseMatch = {
			/* state: true, */
			superUser: new ObjectId(req.tenant._id),
			saleDate: { $gte: fromDate },
		};

		if (customer) {
			baseMatch.customer = new ObjectId(customer);
		}

		report = await Sale.aggregate([
			{
				$match: baseMatch,
			},
			{
				$unwind: '$items',
			},
			{
				$match: {
					'items.product': new ObjectId(id),
				},
			},
			{
				$group: {
					_id: '$items.product',
					count: { $sum: '$items.quantity' },
					total: { $sum: '$items.total' },
					totalCost: { $sum: '$items.totalCost' },
				},
			},
			{
				$project: {
					_id: 0,
					productId: '$_id',
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
				report: report[0] || null,
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
	getProducts,
	getProduct,
	postProduct,
	putProduct,
	deleteProduct,
	getProductHistory,
	reportTotalIndividualProduct,
	reportTotalIndividualProductLast30days,
};
