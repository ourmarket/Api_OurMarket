const { clerkClient } = require('@clerk/clerk-sdk-node');
const { response, request } = require('express');
const bcryptjs = require('bcryptjs');
const { getTokenData } = require('../helpers');
const { User, Role } = require('../models');
const { logger } = require('../helpers/logger');

const getUsers = async (req = request, res = response) => {
	try {
		const users = await User.find({
			state: true,
			superUser: req.tenant._id,
		}).populate('role', ['role', 'type', 'es']);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				total: users.length,
				users,
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

const getUser = async (req, res = response) => {
	try {
		const { id } = req.params;
		const user = await User.findById(id);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				user,
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
const putUser = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { _id, password, google, ...resto } = req.body;

		if (password) {
			// Encriptar la contraseña
			const salt = bcryptjs.genSaltSync();
			resto.password = bcryptjs.hashSync(password, salt);
		}

		const user = await User.findByIdAndUpdate(id, resto);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				user,
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
const patchUser = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { _id, password, google, email, ...resto } = req.body;

		if (password) {
			// Encriptar la contraseña
			const salt = bcryptjs.genSaltSync();
			resto.password = bcryptjs.hashSync(password, salt);
		}

		const user = await User.findByIdAndUpdate(id, resto);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				user,
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

const deleteUser = async (req, res = response) => {
	try {
		const { id } = req.params;
		await User.findByIdAndUpdate(id, { state: false });

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

// clerk
const postUser = async (req, res = response) => {
	try {
		const { name, lastName, email, phone, role } = req.body;

		const tenant = req.tenant;
		const emailNormalized = email.toLowerCase();

		// 1️⃣ Validaciones básicas
		if (!email || !role) {
			return res.status(400).json({
				ok: false,
				msg: 'Email y rol son obligatorios',
			});
		}

		// 2️⃣ Verificar rol existente
		const roleDoc = await Role.findById(role);
		if (!roleDoc) {
			return res.status(400).json({
				ok: false,
				msg: 'Rol inválido',
			});
		}

		// 3️⃣ Verificar si ya existe en Mongo
		const existingUser = await User.findOne({
			email: emailNormalized,
			superUser: tenant._id,
		});

		if (existingUser) {
			return res.status(409).json({
				ok: false,
				errors: {
					email: { msg: 'El email ya existe en este tenant' },
				},
			});
		}

		// 4️⃣ Crear usuario en Clerk (SIN password)
		/* const clerkUser = await clerkClient.users.createUser({
			emailAddress: [emailNormalized],
			firstName: name,
			lastName,
			publicMetadata: {
				tenant: tenant.clientId,
				role: roleDoc.role, // ADMIN_ROLE, CLIENT_ROLE, etc
			},
		}); */

		// 5️⃣ Enviar invitación
		/* await clerkClient.invitations.createInvitation({
			emailAddress: emailNormalized,
		}); */

		// 6️⃣ Crear usuario en Mongo
		const user = await User.create({
			email: emailNormalized,
			name,
			lastName,
			phone,
			role: roleDoc._id,
			superUser: tenant._id,
			state: true,
		});

		return res.status(201).json({
			ok: true,
			user,
		});
	} catch (error) {
		console.error(error);

		// Clerk: email duplicado
		if (error?.errors?.[0]?.code === 'form_identifier_exists') {
			return res.status(409).json({
				ok: false,
				errors: {
					email: { msg: 'El email ya existe en Clerk' },
				},
			});
		}

		return res.status(500).json({
			ok: false,
			msg: 'Error creando usuario',
		});
	}
};

module.exports = {
	getUsers,
	getUser,
	postUser,
	putUser,
	deleteUser,
	patchUser,
};
