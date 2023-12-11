const { response } = require('express');
const {
	SuperUser,
	User,
	Client,
	Category,
	ClientAddress,
	Config,
	DeliverySubZone,
	DeliveryTruck,
	DeliveryZone,
	Distributor,
	Employee,
	Expenses,
	Ofert,
	Order,
	Points,
	Product,
	ProductLot,
	Recommendation,
	Salary,
	Supplier,
} = require('../models');
const bcryptjs = require('bcryptjs');
const { logger } = require('../helpers/logger');

const getSuperUsers = async (req, res = response) => {
	try {
		const { limit = 100, from = 0 } = req.query;
		const query = { state: true };

		const [total, superUsers] = await Promise.all([
			SuperUser.countDocuments(query),
			SuperUser.find(query).skip(Number(from)).limit(Number(limit)),
		]);

		return res.status(200).json({
			ok: true,
			status: 200,
			total,
			superUsers,
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const getSuperUser = async (req, res = response) => {
	try {
		const { id } = req.params;
		const superUser = await SuperUser.findById(id);

		return res.status(200).json({
			ok: true,
			status: 200,
			superUser,
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const postSuperUser = async (req, res = response) => {
	let superUserId = null;
	let userAdminId = null;
	let configId = null;

	try {
		const { superUser, config, userAdmin } = req.body;

		// 1. Crear el superUsuario

		const superUserDB = await SuperUser.findOne({
			clientId: superUser.clientId,
		});

		if (superUserDB) {
			return res.status(400).json({
				msg: `El superUser ${superUser.clientId}, ya existe`,
			});
		}

		const dataSuperUser = {
			...superUser,
		};

		const newSuperUser = new SuperUser(dataSuperUser);

		superUserId = newSuperUser._id;

		// 2. Crear el administrador

		const email = userAdmin.email;

		const findEmail = await User.findOne({
			email,
			superUser: newSuperUser.superUser,
		});

		if (findEmail) {
			logger.error(`El email ${email}, ya existe`);
			return res.status(400).json({
				ok: false,
				status: 200,
				msg: `El email ${email}, ya existe`,
			});
		}

		const salt = bcryptjs.genSaltSync();
		const newPassword = bcryptjs.hashSync(userAdmin.password, salt);

		const dataUserAdmin = {
			...userAdmin,
			password: newPassword,
			verified: true,
			superUser: newSuperUser._id,
		};

		const newUserAdmin = new User(dataUserAdmin);
		userAdminId = newUserAdmin._id;

		// 3. Crear la config

		const dataConfig = {
			...config,
			superUser: newSuperUser._id,
		};

		const newConfig = new Config(dataConfig);
		configId = newConfig._id;

		// 4 Guardar todo en DB

		await newSuperUser.save();
		await newUserAdmin.save();
		await newConfig.save();

		return res.status(201).json({
			ok: true,
			status: 200,
			superUser: newSuperUser,
			userAdmin: newUserAdmin,
			config: newConfig,
		});
	} catch (error) {
		if (superUserId) {
			await SuperUser.deleteOne({ _id: superUserId });
		}
		if (userAdminId) {
			await User.deleteOne({ _id: userAdminId });
		}
		if (configId) {
			await Config.deleteOne({ _id: configId });
		}

		logger.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const putSuperUser = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, user, ...data } = req.body;

		data.user = req.user;

		const superUser = await SuperUser.findByIdAndUpdate(id, data, {
			new: true,
		});

		return res.status(200).json({
			ok: true,
			status: 200,
			superUser,
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const deleteSuperUser = async (req, res = response) => {
	try {
		const { id } = req.params;
		await SuperUser.findByIdAndUpdate(id, { state: false }, { new: true });

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: 'SuperUser borrado',
		});
	} catch (error) {
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

// user
const update = async (req, res = response) => {
	try {
		await User.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Client.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Category.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await ClientAddress.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Config.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await DeliverySubZone.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await DeliveryTruck.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await DeliveryZone.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Distributor.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Employee.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Expenses.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Ofert.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Order.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Points.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Product.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await ProductLot.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Recommendation.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Salary.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);
		await Supplier.updateMany(
			{},
			{ $set: { superUser: '654974527ae94fa111479ad5' } }
		);

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: 'User modificado',
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
	postSuperUser,
	getSuperUsers,
	getSuperUser,
	putSuperUser,
	deleteSuperUser,
	update,
};
