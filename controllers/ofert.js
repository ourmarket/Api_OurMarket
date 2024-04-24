const { response } = require('express');
const { Ofert, Stock } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');
const { ObjectId } = require('mongodb');

const getOferts = async (req, res = response) => {
	// ?stock=
	// 0= normal
	// 1= stock=[{data}]
	try {
		const { stock = 0, limit = 1000000, from = 0 } = req.query;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		if (+stock === 1) {
			const query = { state: true, superUser: tokenData.UserInfo.superUser };
			const notShow = { prices: 0, quantities: 0, __v: 0, superUser: 0 };
			const [total, oferts, stocks] = await Promise.all([
				Ofert.countDocuments(query),
				Ofert.find(query, notShow)
					.populate('product', ['name', 'unit', 'img', 'category', 'type'])
					.skip(Number(from))
					.limit(Number(limit))
					.sort({ description: 1 }),
				Stock.find(
					{
						state: true,
						superUser: new ObjectId(tokenData.UserInfo.superUser),
						stock: {
							$gt: 0,
						},
					},
					{
						_id: 1,
						product: 1,
						quantity: 1,
						cost: 1,
						unityCost: 1,
						stock: 1,
						createdAt: 1,
					}
				),
			]);

			const ofertWithStock = oferts.map((ofert) => {
				const matchingStock = stocks.filter((item) => {
					return item.product.toString() === ofert.product._id.toString();
				});

				if (matchingStock.length > 0) {
					return {
						...ofert._doc,
						stock: matchingStock.map((item) => ({
							...item._doc,
						})),
					};
				} else {
					return {
						...ofert._doc,
						stock: [],
					};
				}
			});

			return res.status(200).json({
				ok: true,
				status: 200,
				total,
				data: {
					oferts: ofertWithStock,
				},
			});
		}

		const oferts = await Ofert.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		})
			.populate('product', [
				'name',
				'description',
				'unit',
				'img',
				'brand',
				'category',
				'type',
				'stock',
			])
			.sort({ createdAt: -1 });

		res.status(200).json({
			ok: true,
			status: 200,
			total: oferts.length,
			data: {
				oferts,
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

const getOfert = async (req, res = response) => {
	// ?stock=
	// 0= normal
	// 1= stock=[{data}]
	try {
		const { id } = req.params;
		const { stock = 0 } = req.query;

		if (+stock === 1) {
			const notShow = { prices: 0, quantities: 0, __v: 0, superUser: 0 };

			const ofert = await Ofert.findById(id, notShow).populate('product', [
				'name',
				'unit',
				'img',
				'category',
				'type',
			]);
			const stock = await Stock.find(
				{
					state: true,
					stock: {
						$gt: 0,
					},
					product: ofert.product._id,
				},
				{
					_id: 1,
					product: 1,
					quantity: 1,
					cost: 1,
					unityCost: 1,
					stock: 1,
					createdAt: 1,
				}
			);

			return res.status(200).json({
				ok: true,
				status: 200,
				data: {
					ofert,
					stock,
				},
			});
		}

		const ofert = await Ofert.findById(id).populate('product', [
			'name',
			'description',
			'unit',
			'img',
			'brand',
			'category',
			'type',
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				ofert,
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
const getOfertByProductId = async (req, res = response) => {
	try {
		const { id } = req.params;
		const ofert = await Ofert.find({ product: id, state: true }).populate(
			'product',
			[
				'name',
				'description',
				'unit',
				'img',
				'brand',
				'category',
				'type',
				'stock',
			]
		);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				ofert,
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

const postOfert = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		// Generar la data a guardar
		const data = {
			...body,
			superUser: tokenData.UserInfo.superUser,
		};

		const ofert = new Ofert(data);

		// Guardar DB
		await ofert.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				ofert,
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

const putOfert = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const ofert = await Ofert.findByIdAndUpdate(id, data, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				ofert,
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

const deleteOfert = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Ofert.findByIdAndUpdate(id, { state: false }, { new: true });

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

const ofertsWithCategory = async (req, res = response) => {
	try {
		const allOferts = await Ofert.aggregate([
			[
				{
					$match: {
						state: true,
					},
				},
				{
					$lookup: {
						from: 'products',
						localField: 'product',
						foreignField: '_id',
						as: 'product',
					},
				},
				{
					$unwind: {
						path: '$product',
					},
				},
				{
					$lookup: {
						from: 'categories',
						localField: 'product.category',
						foreignField: '_id',
						as: 'category',
					},
				},
				{
					$unwind: {
						path: '$category',
					},
				},
			],
		]);
		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				oferts: allOferts,
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
const ofertsWithCategoryById = async (req, res = response) => {
	const { id } = req.params;
	try {
		const allOferts = await Ofert.aggregate([
			{
				$match: {
					state: true,
				},
			},
			{
				$lookup: {
					from: 'products',
					localField: 'product',
					foreignField: '_id',
					as: 'product',
				},
			},
			{
				$unwind: {
					path: '$product',
				},
			},
			{
				$project: {
					_id: '$_id',
					description: '$description',
					productId: '$product._id',
					name: '$product.name',
					img: '$product.img',
					category: '$product.category',
					basePrice: '$basePrice',
					retailPrice: '$retailPrice',
				},
			},
			{
				$match: {
					category: new ObjectId(id),
				},
			},
		]);

		const ofertsWithStock = [];

		for (let i = 0; i < allOferts.length; i++) {
			const ofert = allOferts[i];
			const stock = await Stock.find({
				product: ofert.productId,
				stock: {
					$gt: 0,
				},
			});
			const ofertStock = {
				...allOferts[i],
				stock,
			};
			ofertsWithStock.push(ofertStock);
		}
		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				oferts: ofertsWithStock.filter((item) => item.stock.length > 0),
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
	postOfert,
	getOferts,
	getOfert,
	getOfertByProductId,
	putOfert,
	deleteOfert,
	ofertsWithCategory,
	ofertsWithCategoryById,
};
