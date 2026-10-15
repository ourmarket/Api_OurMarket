const { response } = require('express');
const {
	SuperUser,
	User,
	Config,
	Role,
} = require('../models');
const bcryptjs = require('bcryptjs');
const { logger } = require('../helpers/logger');

/**
 * Obtener todos los tenants (superUsers)
 * Query params: limit, from, state ('all', 'true', 'false'), search
 */
const getSuperUsers = async (req, res = response) => {
	try {
		const { limit = 1000, from = 0, state, search } = req.query;
		const query = {};

		if (state !== undefined && state !== '' && state !== 'all') {
			query.state = state === 'true' || state === true;
		}

		if (search && search.trim() !== '') {
			const regex = new RegExp(search.trim(), 'i');
			query.$or = [
				{ clientId: regex },
				{ 'superUserData.businessName': regex },
				{ 'superUserData.name': regex },
				{ 'superUserData.lastName': regex },
				{ 'superUserData.phone': regex },
				{ 'superUserData.city': regex },
			];
		}

		const [total, superUsers] = await Promise.all([
			SuperUser.countDocuments(query),
			SuperUser.find(query)
				.sort({ createdAt: -1 })
				.skip(Number(from))
				.limit(Number(limit)),
		]);

		// Buscar usuarios administradores asociados a cada tenant (estrictamente con rol ADMIN_ROLE o tipo empleado)
		const adminRole = await Role.findOne({ role: 'ADMIN_ROLE' });
		const adminRoleId = adminRole?._id || '636a631dc2e277ca644463ff';

		const superUsersWithAdmin = await Promise.all(
			superUsers.map(async (su) => {
				const admins = await User.find({
					superUser: su._id,
					role: adminRoleId,
					state: true,
				})
					.select('name lastName email phone role')
					.populate('role', 'role es');

				const ownerName = (su.superUserData?.name || '').trim().toLowerCase();
				const ownerLastName = (su.superUserData?.lastName || '').trim().toLowerCase();
				let primaryAdmin = null;

				if (admins.length > 0) {
					primaryAdmin =
						admins.find(
							(a) =>
								(ownerName && a.name?.toLowerCase().includes(ownerName)) ||
								(ownerLastName && a.lastName?.toLowerCase().includes(ownerLastName))
						) || admins[0];
				}

				const suObj = su.toJSON();
				return {
					...suObj,
					adminUser: primaryAdmin || null,
					adminUsers: admins,
				};
			})
		);

		return res.status(200).json({
			ok: true,
			status: 200,
			total,
			superUsers: superUsersWithAdmin,
			data: {
				total,
				superUsers: superUsersWithAdmin,
			},
		});
	} catch (error) {
		logger.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

/**
 * Obtener un tenant por ID
 */
const getSuperUser = async (req, res = response) => {
	try {
		const { id } = req.params;
		const superUser = await SuperUser.findById(id);

		if (!superUser) {
			return res.status(404).json({
				ok: false,
				status: 404,
				msg: 'Tenant / SuperUser no encontrado',
			});
		}

		const adminRole = await Role.findOne({ role: 'ADMIN_ROLE' });
		const adminRoleId = adminRole?._id || '636a631dc2e277ca644463ff';

		// Buscar exclusivamente los usuarios con rol de administrador (ADMIN_ROLE) de este tenant
		const [admins, config] = await Promise.all([
			User.find({
				superUser: id,
				role: adminRoleId,
				state: true,
			})
				.select('-password -refreshToken')
				.populate('role', 'role es'),
			Config.findOne({ superUser: id }),
		]);

		// Priorizar al admin cuyo nombre coincida con el titular del tenant
		const ownerName = (superUser.superUserData?.name || '').trim().toLowerCase();
		const ownerLastName = (superUser.superUserData?.lastName || '').trim().toLowerCase();
		let primaryAdmin = null;

		if (admins.length > 0) {
			primaryAdmin =
				admins.find(
					(a) =>
						(ownerName && a.name?.toLowerCase().includes(ownerName)) ||
						(ownerLastName && a.lastName?.toLowerCase().includes(ownerLastName))
				) || admins[0];
		}

		return res.status(200).json({
			ok: true,
			status: 200,
			superUser,
			adminUser: primaryAdmin || null,
			adminUsers: admins,
			config,
			data: {
				superUser,
				adminUser: primaryAdmin || null,
				adminUsers: admins,
				config,
			},
		});
	} catch (error) {
		logger.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

/**
 * Crear un nuevo tenant (superUser) con su usuario administrador inicial y configuración
 */
const postSuperUser = async (req, res = response) => {
	let superUserId = null;
	let userAdminId = null;
	let configId = null;

	try {
		const { superUser, config = {}, userAdmin } = req.body;

		if (!superUser || !superUser.clientId || !superUser.superUserData?.businessName) {
			return res.status(400).json({
				ok: false,
				msg: 'El identificador (clientId) y la razón social (businessName) son obligatorios',
			});
		}

		if (!userAdmin || !userAdmin.email || !userAdmin.password) {
			return res.status(400).json({
				ok: false,
				msg: 'El email y la contraseña para el usuario administrador del tenant son obligatorios',
			});
		}

		// Sanitizar y validar clientId único
		const cleanClientId = superUser.clientId.trim().toLowerCase().replace(/\s+/g, '_');
		const superUserDB = await SuperUser.findOne({ clientId: cleanClientId });

		if (superUserDB) {
			return res.status(400).json({
				ok: false,
				msg: `El tenant con Id "${cleanClientId}" ya existe`,
			});
		}

		// 1. Crear el superUsuario
		const dataSuperUser = {
			...superUser,
			clientId: cleanClientId,
			version: superUser.version || 'full',
			state: true,
		};

		const newSuperUser = new SuperUser(dataSuperUser);
		superUserId = newSuperUser._id;

		// 2. Crear el administrador del tenant
		const email = userAdmin.email.trim().toLowerCase();
		const findEmail = await User.findOne({ email });

		if (findEmail) {
			logger.error(`El email ${email} ya está registrado`);
			return res.status(400).json({
				ok: false,
				msg: `El email "${email}" ya se encuentra registrado`,
			});
		}

		// Buscar el rol ADMIN_ROLE en la base de datos
		let adminRole = await Role.findOne({ role: 'ADMIN_ROLE' });
		if (!adminRole) {
			adminRole = await Role.findOne({ role: process.env.ADMIN_ROLE });
		}
		const adminRoleId = adminRole?._id || '636a631dc2e277ca644463ff';

		const salt = bcryptjs.genSaltSync();
		const newPassword = bcryptjs.hashSync(userAdmin.password, salt);

		const dataUserAdmin = {
			name: userAdmin.name || superUser.superUserData?.name || '',
			lastName: userAdmin.lastName || superUser.superUserData?.lastName || '',
			phone: userAdmin.phone || superUser.superUserData?.phone || '',
			email,
			password: newPassword,
			role: userAdmin.role || adminRoleId,
			verified: true,
			state: true,
			superUser: newSuperUser._id,
		};

		const newUserAdmin = new User(dataUserAdmin);
		userAdminId = newUserAdmin._id;

		// 3. Crear la configuración inicial
		const dataConfig = {
			...config,
			superUser: newSuperUser._id,
		};

		const newConfig = new Config(dataConfig);
		configId = newConfig._id;

		// 4. Guardar todo en base de datos
		await newSuperUser.save();
		await newUserAdmin.save();
		await newConfig.save();

		return res.status(201).json({
			ok: true,
			status: 201,
			msg: 'Tenant y administrador creados exitosamente',
			superUser: newSuperUser,
			userAdmin: newUserAdmin,
			config: newConfig,
			data: {
				superUser: newSuperUser,
				userAdmin: newUserAdmin,
				config: newConfig,
			},
		});
	} catch (error) {
		// Rollback si ocurre algún error
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

/**
 * Actualizar tenant existente
 */
const putSuperUser = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { clientId, version, superUserData, state, userAdmin } = req.body;

		const currentSuperUser = await SuperUser.findById(id);
		if (!currentSuperUser) {
			return res.status(404).json({
				ok: false,
				status: 404,
				msg: 'Tenant no encontrado',
			});
		}

		// Si cambia el clientId, verificar que no esté ocupado
		if (clientId && clientId !== currentSuperUser.clientId) {
			const cleanClientId = clientId.trim().toLowerCase().replace(/\s+/g, '_');
			const existing = await SuperUser.findOne({
				clientId: cleanClientId,
				_id: { $ne: id },
			});
			if (existing) {
				return res.status(400).json({
					ok: false,
					msg: `El Id "${cleanClientId}" ya está siendo utilizado por otro tenant`,
				});
			}
			currentSuperUser.clientId = cleanClientId;
		}

		if (version !== undefined) {
			currentSuperUser.version = version;
		}

		if (state !== undefined) {
			currentSuperUser.state = Boolean(state);
		}

		if (superUserData) {
			currentSuperUser.superUserData = {
				...(currentSuperUser.superUserData?.toObject?.() || currentSuperUser.superUserData),
				...superUserData,
			};
		}

		await currentSuperUser.save();

		// Si se enviaron datos para actualizar el usuario administrador del tenant
		if (userAdmin) {
			const updateAdminData = {};
			if (userAdmin.name) updateAdminData.name = userAdmin.name;
			if (userAdmin.lastName) updateAdminData.lastName = userAdmin.lastName;
			if (userAdmin.phone) updateAdminData.phone = userAdmin.phone;
			if (userAdmin.email) updateAdminData.email = userAdmin.email.toLowerCase();
			if (userAdmin.password) {
				const salt = bcryptjs.genSaltSync();
				updateAdminData.password = bcryptjs.hashSync(userAdmin.password, salt);
			}

			if (userAdmin.id) {
				await User.findOneAndUpdate(
					{ _id: userAdmin.id, superUser: id },
					updateAdminData
				);
			} else {
				// Buscar admin con ADMIN_ROLE para este superUser (nunca un cliente)
				const adminRole = await Role.findOne({ role: 'ADMIN_ROLE' });
				const adminRoleId = adminRole?._id || '636a631dc2e277ca644463ff';

				await User.findOneAndUpdate(
					{ superUser: id, role: adminRoleId, state: true },
					updateAdminData
				);
			}
		}

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Tenant actualizado con éxito',
			superUser: currentSuperUser,
			data: {
				superUser: currentSuperUser,
			},
		});
	} catch (error) {
		logger.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

/**
 * Alternar estado (activo / inactivo) o eliminar tenant
 */
const deleteSuperUser = async (req, res = response) => {
	try {
		const { id } = req.params;
		const currentSuperUser = await SuperUser.findById(id);

		if (!currentSuperUser) {
			return res.status(404).json({
				ok: false,
				status: 404,
				msg: 'Tenant no encontrado',
			});
		}

		// Toggle state
		currentSuperUser.state = !currentSuperUser.state;
		await currentSuperUser.save();

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: currentSuperUser.state ? 'Tenant activado exitosamente' : 'Tenant desactivado exitosamente',
			superUser: currentSuperUser,
			data: {
				superUser: currentSuperUser,
			},
		});
	} catch (error) {
		logger.error(error);
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
};
