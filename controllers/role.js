const { response } = require('express');
const { Role } = require('../models');
const { logger } = require('../helpers/logger');

/* 
Estos controladores son generales para todos los clientes
*/

const getRoles = async (req, res = response) => {
	try {
		const { limit = 1000, from = 0 } = req.query;
		const query = { state: { $ne: false } };

		const [total, roles] = await Promise.all([
			Role.countDocuments(query),
			Role.find(query).skip(Number(from)).limit(Number(limit)),
		]);

		res.status(200).json({
			ok: true,
			status: 200,
			total,
			data: {
				roles,
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

const getRole = async (req, res = response) => {
	try {
		const { id } = req.params;
		const role = await Role.findById(id);

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				role,
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

const postRole = async (req, res = response) => {
	try {
		const { role: rawCode, es, type = 'employee', permissions = [] } = req.body;

		if (!es && !rawCode) {
			return res.status(400).json({
				ok: false,
				msg: 'El nombre del rol es obligatorio',
			});
		}

		let formattedRole = (rawCode || es).trim().toUpperCase().replace(/\s+/g, '_');
		if (!formattedRole.endsWith('_ROLE')) {
			formattedRole = `${formattedRole}_ROLE`;
		}

		const roleDB = await Role.findOne({ role: formattedRole });
		if (roleDB) {
			return res.status(400).json({
				ok: false,
				msg: `El rol "${formattedRole}" ya existe`,
			});
		}

		const role = new Role({
			role: formattedRole,
			es: es ? es.trim() : formattedRole,
			type,
			permissions,
			state: true,
		});

		await role.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				role,
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

const putRole = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { role: code, es, type, permissions, state } = req.body;

		const currentRole = await Role.findById(id);
		if (!currentRole) {
			return res.status(404).json({
				ok: false,
				status: 404,
				msg: 'Rol no encontrado',
			});
		}

		const isImmutable =
			currentRole.role === 'SUPER_ADMIN_ROLE' ||
			currentRole.role === 'ADMIN_ROLE' ||
			currentRole.role === 'CLIENT_ROLE' ||
			currentRole.type === 'client';

		const updateData = {};
		if (es !== undefined) updateData.es = es;
		if (permissions !== undefined) updateData.permissions = permissions;
		if (state !== undefined && !isImmutable) updateData.state = state;
		if (type !== undefined && !isImmutable) updateData.type = type;
		if (code !== undefined && !isImmutable) updateData.role = code;

		const role = await Role.findByIdAndUpdate(id, updateData, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				role,
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

const deleteRole = async (req, res = response) => {
	try {
		const { id } = req.params;

		const currentRole = await Role.findById(id);
		if (!currentRole) {
			return res.status(404).json({
				ok: false,
				status: 404,
				msg: 'Rol no encontrado',
			});
		}

		const isImmutable =
			currentRole.role === 'SUPER_ADMIN_ROLE' ||
			currentRole.role === 'ADMIN_ROLE' ||
			currentRole.role === 'CLIENT_ROLE' ||
			currentRole.type === 'client';

		if (isImmutable) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: 'Los roles de Super Administrador, Administrador y Cliente son del sistema y no pueden eliminarse',
			});
		}

		await Role.findByIdAndUpdate(id, { state: false }, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Rol eliminado con éxito',
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
	postRole,
	getRoles,
	getRole,
	putRole,
	deleteRole,
};
