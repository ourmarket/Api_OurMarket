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
	try {
		const { superUser, ...body } = req.body;

		const superUserDB = await SuperUser.findOne({ superUser });

		if (superUserDB) {
			return res.status(400).json({
				msg: `El superUser ${superUserDB.superUser}, ya existe`,
			});
		}

		// Generar la data a guardar
		const data = {
			...body,
		};

		const newSuperUser = new SuperUser(data);

		// Guardar DB
		await newSuperUser.save();

		return res.status(201).json({
			ok: true,
			status: 200,
			superUser: newSuperUser,
		});
	} catch (error) {
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
