const { response, request } = require('express');
const bcryptjs = require('bcryptjs');
const { getToken, getTokenData } = require('../helpers');
const { User } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../config/nodemailer');
const { getEmailTemplate } = require('../template/emailTemplate');
const { logger } = require('../helpers/logger');
/* 
superUser en la creación de un nuevo usuario debe enviarse a traves del cliente, 
dentro de los datos enviados via POST.
*/

const getUsers = async (req = request, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const users = await User.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
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

const postUser = async (req, res = response) => {
	try {
		const { state, password, email, ...body } = req.body;

		const salt = bcryptjs.genSaltSync();
		const newPassword = bcryptjs.hashSync(password, salt);

		// Generar el código
		const code = uuidv4();

		const data = {
			...body,
			email,
			password: newPassword,
			verifiedCode: code,
		};

		// Crear un nuevo usuario
		const user = new User(data);

		// Generar token

		const token = await getToken({ email, code });

		// Obtener un template
		const url = `${process.env.BASE_URL}/user/verify/${token}`;
		const template = getEmailTemplate(body.name, url);

		// Enviar el email

		await sendEmail(email, 'Confirma email, Distribuidora Ringo', template);

		// Guardar en BD
		await user.save();

		res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Usuario registrado correctamente',
			data: {
				id: user._id,
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
const getUserVerify = async (req, res = response) => {
	try {
		// Obtener el token
		const { token } = req.params;

		// Verificar la data
		const data = await getTokenData(token);

		if (data === null) {
			return res.json({
				success: false,
				msg: 'Error al obtener data',
			});
		}

		const { email, code } = data.data;

		// Verificar existencia del usuario
		const user = (await User.findOne({ email })) || null;

		if (user === null) {
			return res.status(401).json({
				ok: false,
				msg: 'Usuario no existe',
			});
		}

		// Verificar el código
		if (code !== user.verifiedCode) {
			return res.redirect('/error.html');
		}

		// Actualizar usuario
		user.verified = true;
		await user.save();

		return res.redirect('/confirm.html');
	} catch (error) {
		logger.error(error);
		return res.json({
			success: false,
			msg: 'Error al confirmar usuario',
		});
	}
};

const putUserChangePassword = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { password, newPassword } = req.body;

		const user = await User.findById(id);

		if (!bcryptjs.compareSync(password, user.password)) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: 'La contraseña ingresada no es correcta',
			});
		}

		const salt = bcryptjs.genSaltSync();
		user.password = bcryptjs.hashSync(newPassword, salt);

		await User.findByIdAndUpdate(id, user, {
			new: true,
		});

		res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Contraseña cambiada correctamente',
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
	getUsers,
	getUser,
	postUser,
	putUser,
	deleteUser,
	patchUser,
	getUserVerify,
	putUserChangePassword,
};
