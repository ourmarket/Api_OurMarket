const { response } = require('express');
const { Ofert, Stock, Product } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');
const { ObjectId } = require('mongodb');
const stock = require('../models/stock');

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

/**
 * POST /api/ofertas/buscar
 * Body esperado:
 * [
 *   {
 *     "product": "pechito",
 *     "quantity": 7.4,
 *     "unit": "kg",
 *     "manualPrice": 6200
 *   }
 * ]
 */
const buscarOfertas = async (req, res) => {
	try {
		const items = req.body;

		

		if (!Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ ok: false, msg: 'Formato inválido' });
		}

		const resultados = [];

		for (const item of items) {
			const nombre = item.product;
			if (!nombre) continue;

			// Buscar TODAS las coincidencias aproximadas
			const coincidencias = await Ofert.find({
				description: { $regex: nombre, $options: 'i' },
				state: true,
				superUser: '654974527ae94fa111479ad5',
			}).populate('product', 'name');

			// No encontró nada
			if (coincidencias.length === 0) {
				resultados.push({
					...item,
					coincidencias: [],
					encontrado: false,
					msg: 'Sin coincidencias',
				});
				return res.json({
					ok: false,
					msg: `No se encontraron productos con este nombre: *${nombre}*. Reinicia el pedido.`,
				});
			}

			// Mapear coincidencias
			const coincidenciasMapped = coincidencias.map((p) => ({
				id: p._id,
				description: p.description,
				productId: p.product,
				basePrice: p.basePrice,
			}));

			resultados.push({
				...item,
				encontrado: coincidencias.length === 1,
				coincidencias: coincidenciasMapped,
			});
		}

		console.log(resultados)
		res.json({
			ok: true,
			resultados,
		});
	} catch (error) {
		console.error('Error búsqueda ofertas:', error);
		res.status(500).json({
			ok: false,
			msg: 'Error interno del servidor',
		});
	}
};

module.exports = {
	buscarOfertas,
	postOfert,
	getOferts,
	getOfert,
	getOfertByProductId,
	putOfert,
	deleteOfert,
	ofertsWithCategory,
	ofertsWithCategoryById,
};
