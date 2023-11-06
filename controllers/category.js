const { response } = require('express');
const { Category } = require('../models');
const { getTokenData } = require('../helpers');

const getCategories = async (req, res = response) => {
	try {
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const categories = await Category.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		}).populate('user', 'name');

		return res.status(200).json({
			ok: true,
			status: 200,
			total: categories.length,
			categories,
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const getCategory = async (req, res = response) => {
	try {
		const { id } = req.params;
		const category = await Category.findById(id).populate('user', 'name');

		return res.status(200).json({
			ok: true,
			status: 200,
			category,
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const postCategory = async (req, res = response) => {
	try {
		const { name, img } = req.body;
		const jwt = req.cookies.jwt;
		const tokenData = getTokenData(jwt);

		const categoryDB = await Category.findOne({
			name,
			state: true,
			superUser: tokenData.UserInfo.superUser,
		});

		if (categoryDB) {
			return res.status(400).json({
				msg: `La categoría ${categoryDB.name}, ya existe`,
			});
		}

		// Generar la data a guardar
		const data = {
			name,
			img,
			user: req.user,
			superUser: tokenData.UserInfo.superUser,
		};

		const category = new Category(data);

		// Guardar DB
		await category.save();

		return res.status(201).json({
			ok: true,
			status: 200,
			category,
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const putCategory = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, user, ...data } = req.body;

		data.user = req.user;

		const category = await Category.findByIdAndUpdate(id, data, { new: true });

		return res.status(200).json({
			ok: true,
			status: 200,
			category,
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const deleteCategory = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Category.findByIdAndUpdate(id, { state: false }, { new: true });

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Categoria borrada',
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

module.exports = {
	postCategory,
	getCategories,
	getCategory,
	putCategory,
	deleteCategory,
};
