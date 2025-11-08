const bcryptjs = require('bcryptjs');
const { User, Role, SuperUser } = require('../../models');
const jwt = require('jsonwebtoken');
const { logger } = require('../../helpers/logger');

const loginPreventas = async (req, res) => {
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
		if (
			role.role !== process.env.PREVENTISTA_ROLE &&
			role.role !== process.env.ADMIN_ROLE
		) {
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
			await User.findByIdAndUpdate(foundUser._id, {
				$set: { refreshToken: [...newRefreshTokenArray, newRefreshToken] },
				
			});

			// Se crea una Cookie segura con el refresh token
			res.cookie('jwt_deliveryApp', newRefreshToken, {
				httpOnly: true,
				secure: true,
				sameSite: 'None',
				maxAge: 24 * 60 * 60 * 1000,
			});

			// Se envía el id del usuario y el rol en el token
			return res.status(201).json({
				ok: true,
				status: 201,
				accessToken,
				id: foundUser._id,
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

const refreshPreventas = async (req, res) => {
	try {
		const cookies = req.cookies;

		if (!cookies?.jwt_deliveryApp) {
			logger.error({
				ip: req.clientIp,
				msg: 'No autorizado - No hay cookie de refresh token',
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
			.exec(); // Se detecta reutilización de RT (el token no está en la BD)

		if (!foundUser) {
			console.log('Se detecta posible reutilización de refresh token'); // Se usa JWT_REFRESH, no JWT_SECRET, para verificar el refresh token.
			// **** CORRECCIÓN CRÍTICA ****
			jwt.verify(
				refreshToken,
				process.env.JWT_REFRESH,
				async (err, decoded) => {
					if (err) {
						// El token es inválido (o expiró, etc.), no se puede decodificar.
						logger.error({
							ip: req.clientIp,
							msg: 'Error al verificar token reutilizado',
							err,
						});
						return res.status(403).json({
							ok: false,
							status: 403,
							msg: 'Token inválido',
						});
					} // Se borran todos los refresh tokens del usuario hackeado.

					// Si no hay error, 'decoded' es válido y podemos ver a quién pertenecía el token.
					console.log(
						`Token reutilizado detectado para el usuario: ${decoded.UserInfo.id}`
					);
					await User.findByIdAndUpdate(decoded.UserInfo.id, {
						$set: { refreshToken: [] },
					});
				}
			); // Se responde con Forbidden en cualquier caso de token no encontrado.
			logger.error({
				ip: req.clientIp,
				msg: 'Usuario no encontrado (token reutilizado)',
			});
			return res.status(403).json({
				ok: false,
				status: 403,
				msg: 'Usuario no encontrado',
			}); // Forbidden
		} // El token se encontró en la BD, se procede normalmente. // Se filtra el token actual (que se acaba de usar) del array.

		const newRefreshTokenArray = foundUser.refreshToken.filter(
			(rt) => rt !== refreshToken
		); // Verificar el JWT (el token que vino en la cookie)

		jwt.verify(refreshToken, process.env.JWT_REFRESH, async (err, decoded) => {
			// **** CORRECCIÓN LÓGICA ****
			// Se maneja el error (ej. token expirado) primero y se detiene la ejecución.
			if (err) {
				// El token expiró antes de ser usado.
				logger.error({ ip: req.clientIp, msg: 'Refresh token expirado', err }); // Se limpia el token expirado de la BD.
				await User.findByIdAndUpdate(foundUser._id, {
					$set: { refreshToken: [...newRefreshTokenArray] },
					
				});
				return res.status(403).json({
					ok: false,
					status: 403,
					msg: 'Token expirado',
					err,
				});
			}

			// Si 'err' es nulo, 'decoded' existe. Ahora se comprueba la consistencia del ID.
			if (foundUser._id.toString() !== decoded.UserInfo.id) {
				logger.error({
					ip: req.clientIp,
					msg: 'Discrepancia de ID en token',
					userId: foundUser._id,
					decodedId: decoded.UserInfo.id,
				});
				return res.status(403).json({
					ok: false,
					status: 403,
					msg: 'Token inválido',
				}); // Forbidden
			} // El Refresh token es válido. Se generan nuevos tokens.

			const role = await Role.findById(foundUser.role); // **** CORRECCIÓN DE INCONSISTENCIA ****
			// Se usa la misma expiración del login ('120m') para el access token.
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
				{ expiresIn: '120m' } // 2 horas, igual que en el login
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
				{ expiresIn: '1d' } // 1 día para el refresh token
			);
			// Se guarda el nuevo refresh token en la BD
			await User.findByIdAndUpdate(foundUser._id, {
				$set: { refreshToken: [...newRefreshTokenArray, newRefreshToken] },
			}); // Se envía el nuevo refresh token como cookie segura

			res.cookie('jwt_deliveryApp', newRefreshToken, {
				httpOnly: true,
				secure: true,
				sameSite: 'None',
				maxAge: 24 * 60 * 60 * 1000,
			}); // Se envía el nuevo access token y los datos del usuario

			return res.status(200).json({
				accessToken,
				id: foundUser._id,
				superUser: foundUser.superUser._id,
				version: foundUser.superUser.version,
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

const logoutPreventas = async (req, res) => {
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

		await User.findByIdAndUpdate(foundUser._id, {
			$set: { refreshToken: [] },
		});

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

module.exports = { loginPreventas, refreshPreventas, logoutPreventas };
