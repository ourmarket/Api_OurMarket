const bcryptjs = require('bcryptjs');
const {
	User,
	Role,
	Client,
	SuperUser,
	DeliveryTruck,
} = require('../../models');
const jwt = require('jsonwebtoken');
const { logger } = require('../../helpers/logger');

const loginDeliveryApp = async (req, res) => {
	const cookies = req.cookies;
	try {
		const { email, password, clientId } = req.body;
		if (!email || !password)
			return res.status(400).json({ msg: 'Email o password no son correctos' });

		// Verificar client Id
		const foundClientId = await SuperUser.findOne({ clientId });

		if (!foundClientId) {
			logger.error({
				ip: req.clientIp,
				email,
				msg: `El Id: ${clientId} de cliente no encontrado`,
			});
			return res.status(400).json({
				ok: false,
				status: 401,
				msg: `Id de cliente ${clientId} no encontrado`,
			});
		}

		// Verificar si el email existe
		let role;
		const foundUser = await User.findOne({
			email,
			superUser: foundClientId._id,
			state: true,
		})
			.populate('superUser')
			.exec();

		if (foundUser) {
			role = await Role.findById(foundUser.role);
		} else {
			return res.status(401).json({
				msg: 'Email o password no son correctos',
			});
		}
		// SI el user está activo
		if (!foundUser.state) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'Email o password no son correctos',
			});
		}
		// SI no es repartidor
		if (role.role !== process.env.DELIVERY_ROLE) {
			return res.status(403).json({
				ok: false,
				status: 403,
				msg: 'Esta cuenta no tiene permisos de acceso',
			});
		}

		// Verificar la contraseña
		const validPassword = await bcryptjs.compare(password, foundUser.password);

		if (validPassword) {
			// create JWTs
			const accessToken = jwt.sign(
				{
					UserInfo: {
						id: foundUser._id,
						role: role.role,
						superUser: foundUser.superUser._id,
						version: foundUser.superUser.version,
						superUserData: foundUser.superUser.superUserData,
					},
				},
				process.env.JWT_SECRET,
				{ expiresIn: '120m' }
			);
			const newRefreshToken = jwt.sign(
				{
					UserInfo: {
						id: foundUser._id,
						role: role.role,
						superUser: foundUser.superUser._id,
						version: foundUser.superUser.version,
						superUserData: foundUser.superUser.superUserData,
					},
				},
				process.env.JWT_REFRESH,
				{ expiresIn: '1d' }
			);

			// Changed to let keyword
			let newRefreshTokenArray = !cookies?.jwt_deliveryApp
				? foundUser.refreshToken
				: foundUser.refreshToken.filter((rt) => rt !== cookies.jwt_deliveryApp);

			if (cookies?.jwt_deliveryApp) {
				/* Posibles escenarios:
                1) El usuario inicia sesión pero nunca usa RT y no cierra la sesión
                2) RT es robado
                3) Si 1 y 2, hay que borrar todos los RT cuando el usuario inicia sesión */
				const refreshToken = cookies.jwt_deliveryApp;
				const foundToken = await User.findOne({ refreshToken }).exec();

				// Se detecta rt reutilizado!
				if (!foundToken) {
					// se limpian todos los anteriores refresh tokens
					newRefreshTokenArray = [];
				}

				res.clearCookie('jwt_deliveryApp', {
					httpOnly: true,
					sameSite: 'None',
					secure: true,
				});
			}

			// Se guarda el refreshToken en el usuario actual
			foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
			await foundUser.save();

			// Se crea una Cookie segura con el refresh token
			res.cookie('jwt_deliveryApp', newRefreshToken, {
				httpOnly: true,
				secure: true,
				sameSite: 'None',
				maxAge: 24 * 60 * 60 * 1000,
			});
			// Buscar datos del repartidor
			const deliveryTruck = await DeliveryTruck.find({
				user: foundUser._id,
				state: true,
			})
				.populate('distributor')
				.populate('user', ['name', 'lastName', 'phone', 'email'])
				.populate('defaultZone', ['name', 'cost']);

			// Se envía el id del usuario y el rol en el token
			return res.status(201).json({
				ok: true,
				status: 201,
				accessToken,
				id: foundUser._id,
				deliveryTruck: deliveryTruck[0],
				superUser: foundUser.superUser._id,
				version: foundUser.superUser.version,
				superUserData: foundUser.superUser.superUserData,
			});
		} else {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'Email o password no son correctos',
			});
		}
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const refreshDeliveryApp = async (req, res) => {
	try {
		const cookies = req.cookies;

		if (!cookies?.jwt_deliveryApp) {
			logger.error({
				ip: req.clientIp,
				msg: 'No autorizado',
			});
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No autorizado',
			});
		}
		const refreshToken = cookies.jwt_deliveryApp;

		res.clearCookie('jwt_deliveryApp', {
			httpOnly: true,
			sameSite: 'None',
			secure: true,
		});

		const foundUser = await User.findOne({ refreshToken })
			.populate('superUser')
			.exec();

		// Se detecta reutilización de RT
		if (!foundUser) {
			jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
				if (err) {
					logger.error({
						ip: req.clientIp,
						msg: err,
					});
					return res.status(403).json({
						ok: false,
						status: 403,
						msg: err,
						refreshToken,
					}); // Forbidden
				}
				// Delete refresh tokens of hacked user
				const hackedUser = await User.findOne({ _id: decoded.id }).exec();
				hackedUser.refreshToken = [];
				await hackedUser.save();
			});
			logger.error({
				ip: req.clientIp,
				msg: 'Usuario no encontrado',
			});
			return res.status(403).json({
				ok: false,
				status: 403,
				msg: 'Usuario no encontrado',
			}); // Forbidden
		}

		const newRefreshTokenArray = foundUser.refreshToken.filter(
			(rt) => rt !== refreshToken
		);

		// evaluate jwt
		jwt.verify(refreshToken, process.env.JWT_REFRESH, async (err, decoded) => {
			if (err) {
				// expired refresh token
				foundUser.refreshToken = [...newRefreshTokenArray];
				await foundUser.save();
			}
			if (err || foundUser._id.toString() !== decoded.UserInfo.id) {
				logger.error({
					ip: req.clientIp,
					msg: 'Error de token',
					err,
				});
				return res.status(403).json({
					ok: false,
					status: 403,
					msg: 'Error de token',
					err,
				}); // Forbidden);
			}

			// Refresh token was still valid
			// const roles = Object.values(foundUser.roles);
			const role = await Role.findById(foundUser.role);

			const accessToken = jwt.sign(
				{
					UserInfo: {
						id: foundUser._id,
						role: role.role,
						superUser: foundUser.superUser._id,
						version: foundUser.superUser.version,
						superUserData: foundUser.superUser.superUserData,
					},
				},
				process.env.JWT_SECRET,
				{ expiresIn: '1d' }
			);

			const newRefreshToken = jwt.sign(
				{
					UserInfo: {
						id: foundUser._id,
						role: role.role,
						superUser: foundUser.superUser._id,
						version: foundUser.superUser.version,
						superUserData: foundUser.superUser.superUserData,
					},
				},
				process.env.JWT_REFRESH,
				{ expiresIn: '1d' }
			);
			// Saving refreshToken with current user
			foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
			await foundUser.save();

			const client = await Client.findOne({ user: foundUser?._id }).populate(
				'clientType',
				['clientType']
			);

			// Creates Secure Cookie with refresh token
			res.cookie('jwt_deliveryApp', newRefreshToken, {
				httpOnly: true,
				secure: true,
				sameSite: 'None',
				maxAge: 24 * 60 * 60 * 1000,
			});

			return res.status(200).json({
				accessToken,
				id: foundUser._id,
				superUser: foundUser.superUser._id,
				version: foundUser.superUser.version,
				clientType: client?.clientType?.clientType,
				superUserData: foundUser.superUser.superUserData,
			});
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

const logoutDeliveryApp = async (req, res) => {
	try {
		// On client, also delete the accessToken

		const cookies = req.cookies;
		if (!cookies?.jwt_deliveryApp) return res.sendStatus(204); // No content
		const refreshToken = cookies.jwt_deliveryApp;

		// Is refreshToken in db?
		const foundUser = await User.findOne({ refreshToken }).exec();
		if (!foundUser) {
			res.clearCookie('jwt_deliveryApp', {
				httpOnly: true,
				sameSite: 'None',
				secure: true,
			});
			return res.sendStatus(204);
		}

		// Delete refreshToken in db
		foundUser.refreshToken = foundUser.refreshToken.filter(
			(rt) => rt !== refreshToken
		);
		await foundUser.save();

		res.clearCookie('jwt_deliveryApp', {
			httpOnly: true,
			sameSite: 'None',
			secure: true,
		});
		res.sendStatus(204);
	} catch (error) {
		logger.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

module.exports = { loginDeliveryApp, refreshDeliveryApp, logoutDeliveryApp };
