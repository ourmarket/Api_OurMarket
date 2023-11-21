/* eslint-disable eqeqeq */
const { response } = require('express');
const { Product, Ofert } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getProducts = async (req, res = response) => {
	try {
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const { limit = 100000, from = 0 } = req.query;
		const query = { state: true, superUser: tokenData.UserInfo.superUser };

		const [total, products] = await Promise.all([
			Product.countDocuments(query),
			Product.find(query)
				.populate('user', 'name')
				.populate('category', 'name')
				.skip(Number(from))
				.limit(Number(limit))
				.sort({ createdAt: -1 }),
		]);

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
		const product = await Product.findById(id)
			.populate('user', 'name')
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

const postProduct = async (req, res = response) => {
	try {
		const { state, ...body } = req.body;
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		// Generar la data a guardar
		const data = {
			...body,
			user: req.user,
			superUser: tokenData.UserInfo.superUser,
		};

		const product = new Product(data);

		// Guardar DB
		await product.save();

		res.status(200).json(product);
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const putProduct = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, user, newStock, ...data } = req.body;

		data.user = req.user;

		if (newStock) {
			const productWithNewStock = await Product.findById(id);

			const newData = {
				stock: [...productWithNewStock.stock, newStock],
			};

			const product = await Product.findByIdAndUpdate(id, newData, {
				new: true,
			});

			return res.json(product);
		}

		const product = await Product.findByIdAndUpdate(id, data, { new: true });

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

const deleteProduct = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Product.findByIdAndUpdate(id, { state: false }, { new: true });

		await Ofert.updateMany({ product: id }, { state: false });

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
const createOrderStock = async (req, res = response) => {
	const { totalQuantity } = req.body;
	const { id } = req.params;
	try {
		const productEdit = await Product.findById(id);

		const stock = productEdit.stock;

		const totalStock = stock.reduce((acc, curr) => curr.stock + acc, 0);

		if (totalStock === 0) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: 'El producto no tiene stock',
			});
		}

		const updateStock = (num, arr) => {
			let acc = [];
			let rest = num;
			for (let i = 0; i < arr.length; i++) {
				if (rest > 0) {
					acc = [
						...acc,
						{
							_id: arr[i]._id,
							productId: arr[i].productId,
							name: arr[i].name,
							img: arr[i].img,
							supplier: arr[i].supplier,
							quantity: arr[i].quantity,
							cost: arr[i].cost,
							unityCost: arr[i].unityCost,
							location: arr[i].location,
							moveDate: arr[i].moveDate,
							createdStock: arr[i].createdStock,
							stock: arr[i].stock - rest > 0 ? arr[i].stock - rest : 0,
							updateStock: new Date(),
						},
					];

					rest = rest - arr[i].stock;
				} else {
					acc = [
						...acc,
						{
							_id: arr[i]._id,
							productId: arr[i].productId,
							name: arr[i].name,
							img: arr[i].img,
							supplier: arr[i].supplier,
							quantity: arr[i].quantity,
							cost: arr[i].cost,
							unityCost: arr[i].unityCost,
							location: arr[i].location,
							moveDate: arr[i].moveDate,
							createdStock: arr[i].createdStock,
							stock: arr[i].stock,
							updateStock: arr[i].updateStock,
						},
					];
				}
			}
			return acc;
		};

		const productE = {
			...productEdit._doc,
			stock: updateStock(totalQuantity, stock),
		};

		const product = await Product.findByIdAndUpdate(id, productE, {
			new: true,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				product,
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
const updateProductStock1 = async (req, res = response) => {
	// si el numero es positivo restamos stock
	// si el numero es negativo sumamos stock
	// si es cero devolvemos error
	const { totalQuantity, stockId } = req.body;
	const { id } = req.params;
	try {
		const productEdit = await Product.findById(id);

		const stock = productEdit.stock;

		// ----------------positivo-----------------------
		if (totalQuantity > 0) {
			const totalStock = stock.reduce((acc, curr) => curr.stock + acc, 0);

			if (totalStock === 0) {
				return res.status(400).json({
					ok: false,
					status: 400,
					msg: 'El producto no tiene stock',
				});
			}

			const updateStock = (num, arr) => {
				let acc = [];
				let rest = num;
				for (let i = 0; i < arr.length; i++) {
					if (rest > 0 && arr[i].stock > 0) {
						acc = [
							...acc,
							{
								_id: arr[i]._id,
								productId: arr[i].productId,
								name: arr[i].name,
								img: arr[i].img,
								supplier: arr[i].supplier,
								quantity: arr[i].quantity,
								cost: arr[i].cost,
								unityCost: arr[i].unityCost,
								location: arr[i].location,
								moveDate: arr[i].moveDate,
								createdStock: arr[i].createdStock,
								return: arr[i].return,
								stock: arr[i].stock - rest > 0 ? arr[i].stock - rest : 0,
								updateStock: new Date(),
							},
						];

						rest = rest - arr[i].stock;
					} else {
						acc = [
							...acc,
							{
								_id: arr[i]._id,
								productId: arr[i].productId,
								name: arr[i].name,
								img: arr[i].img,
								supplier: arr[i].supplier,
								quantity: arr[i].quantity,
								cost: arr[i].cost,
								unityCost: arr[i].unityCost,
								location: arr[i].location,
								moveDate: arr[i].moveDate,
								createdStock: arr[i].createdStock,
								stock: arr[i].stock,
								updateStock: arr[i].updateStock,
								return: arr[i].return,
							},
						];
					}
				}
				return acc;
			};

			const productE = {
				...productEdit._doc,
				stock: updateStock(totalQuantity, stock),
			};

			const product = await Product.findByIdAndUpdate(id, productE, {
				new: true,
			});

			return res.status(200).json({
				ok: true,
				status: 200,
				data: {
					product,
				},
			});
		}

		// ----------------negativo-----------------------
		if (totalQuantity < 0) {
			// agrega stock como stock de retorno

			const [filterStock] = productEdit._doc.stock.filter(
				(stock) => stock._id == stockId
			);

			const editStock = [
				{
					productId: filterStock.productId,
					name: filterStock.name,
					img: filterStock.img,
					supplier: filterStock.supplier,
					cost: filterStock.cost,
					unityCost: filterStock.unityCost,
					location: filterStock.location,
					moveDate: filterStock.moveDate,
					createdStock: filterStock.createdStock,

					stock: -totalQuantity,
					quantity: -totalQuantity,
					updateStock: new Date(),
					return: true,
				},
				...productEdit._doc.stock,
			];
			/* stock[stock.length - 1].stock =
        stock[stock.length - 1].stock + -totalQuantity;
      stock[stock.length - 1].updateStock = new Date(); */

			const productE = {
				...productEdit._doc,
				stock: editStock,
			};

			const product = await Product.findByIdAndUpdate(id, productE, {
				new: true,
			});

			return res.status(200).json({
				ok: true,
				status: 200,

				data: {
					product,
				},
			});
		}
		// ----------------cero-----------------------
		if (totalQuantity == 0) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: 'El numero no puede se 0',
			});
		}
	} catch (error) {
		logger.error(error);
		res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const updateProductStock = async (req, res = response) => {
	const { stockId, totalQuantity } = req.body;
	const { id } = req.params;
	try {
		const productEdit = await Product.findById(id);

		const [stockToEdit] = productEdit.stock.filter(
			(stock) => stock._id == stockId
		);

		const restOfStock = productEdit.stock.filter(
			(stock) => stock._id != stockId
		);
		stockToEdit.stock = stockToEdit.stock - totalQuantity;
		stockToEdit.updateStock = new Date();

		const productE = {
			...productEdit,
			stock: [...restOfStock, stockToEdit],
		};

		const product = await Product.findByIdAndUpdate(id, productE, {
			new: true,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				product,
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
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);
		const ofert = await Ofert.findOne({
			product: id,
			state: true,
			superUser: tokenData.UserInfo.superUser,
		}).populate('product', [
			'name',
			'description',
			'unit',
			'img',
			'brand',
			'category',
			'type',
			'stock',
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

module.exports = {
	postProduct,
	getProducts,
	getProduct,
	putProduct,
	deleteProduct,
	updateProductStock,
	updateProductStock1,
	getOfertByProductId,
	createOrderStock,
};
