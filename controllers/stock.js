const { response } = require('express');
const { Stock } = require('../models');

const { logger } = require('../helpers/logger');
const { ObjectId } = require('mongodb');

// ✔
const getAllStock = async (req, res = response) => {
	try {
		const stock = await Stock.find({
			state: true,
			superUser: req.tenant._id,
		})
			.populate('product', ['name', 'img'])
			.sort({ createdAt: -1 });

		return res.status(200).json({
			ok: true,
			status: 200,
			total: stock.length,
			data: {
				stock,
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
// ✔
const getAvailableStock = async (req, res = response) => {
	try {
		const stock = await Stock.aggregate([
			{
				$match: {
					state: true,
					superUser: new ObjectId(req.tenant._id),
					stock: {
						$gt: 0,
					},
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
				$group: {
					_id: {
						productId: '$product._id',
						name: '$product.name',
						img: '$product.img',
					},
					actualStock: {
						$sum: '$stock',
					},
					quantityBuy: {
						$sum: '$quantity',
					},
				},
			},
			{
				$project: {
					_id: 0,
					productId: '$_id.productId',
					name: '$_id.name',
					img: '$_id.img',
					actualStock: 1,
					quantityBuy: 1,
				},
			},
			{
				$sort: {
					name: 1,
				},
			},
		]);

		return res.status(200).json({
			ok: true,
			status: 200,
			data: {
				stock,
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
// ✔
const getStock = async (req, res = response) => {
	try {
		const { id } = req.params;

		const stock = await Stock.findById(id).populate('product', [
			'name',
			'unit',
			'img',
			'category',
			'type',
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				stock,
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

// ✔
const postStock = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;

		// Generar la data a guardar
		const data = {
			...body,
			superUser: req.tenant._id,
		};

		const stock = new Stock(data);

		// Guardar DB
		await stock.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				stock,
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
// ✔
const putStock = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const stock = await Stock.findByIdAndUpdate(id, data, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				stock,
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

const deleteStock = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Stock.findByIdAndUpdate(id, { state: false }, { new: true });

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
	getAllStock,
	getAvailableStock,
	getStock,
	postStock,
	putStock,
	deleteStock,
};
