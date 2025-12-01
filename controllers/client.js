/* eslint-disable no-unreachable */
/* eslint-disable no-unused-vars */
const { response } = require('express');
const {
	Client,
	Recommendation,
	ClientAddress,
	Points,
	User,
} = require('../models');
const bcryptjs = require('bcryptjs');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getClients = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const clients = await Client.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		})
			.populate('clientCategory', ['clientCategory'])
			.populate('user', ['name', 'lastName', 'phone', 'email'])
			.populate('clientType', ['clientType']);

		return res.status(200).json({
			ok: true,
			status: 200,
			total: clients.length,
			data: {
				clients,
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

const getClient = async (req, res = response) => {
	try {
		const { id } = req.params;
		const client = await Client.findById(id)
			.populate('clientCategory', ['clientCategory'])
			.populate('user', ['name', 'lastName', 'phone', 'email'])
			.populate('clientType', ['clientType']);

		const points = await Points.find({ state: true, clientId: id });
		const totalPoints = points.reduce((acc, curr) => acc + curr.points, 0);

		const dataClient = client;

		const data = {
			...dataClient._doc,
			points: totalPoints,
		};

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				client: data,
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

const postClient = async (req, res = response) => {
	try {
		const { state, recommendation, ...body } = req.body;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const clientDB = await Client.findOne({ cuit: body.cuit });

		if (clientDB && clientDB.cuit) {
			logger.error({
				msg: `El cuit ${clientDB.cuit}, ya existe`,
			});
			return res.status(400).json({
				msg: `El cuit ${clientDB.cuit}, ya existe`,
			});
		}

		// Generar la data a guardar
		const data = {
			...body,
			superUser: tokenData.UserInfo.superUser,
		};

		const client = new Client(data);

		if (recommendation) {
			const data = {
				clientId: recommendation,
				recommendedClient: client._id,
				recommendedUser: client.user,
			};
			const recomm = new Recommendation(data);

			// Guardar DB
			await recomm.save();
		}

		// Guardar DB
		await client.save();

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				client,
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

const putClient = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, ...data } = req.body;

		const client = await Client.findByIdAndUpdate(id, data, { new: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				client,
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

const deleteClient = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Client.findByIdAndUpdate(id, { state: false }, { new: true });

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

const getUserClient = async (req, res = response) => {
	try {
		const { id } = req.params;
		const client = await Client.find({ user: id, state: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				client,
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
const getAddressesClient = async (req, res = response) => {
	try {
		const { id } = req.params;
		const clientAddress = await ClientAddress.find({ client: id, state: true });

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				clientAddress,
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

// crud de cliente/usuario/direccion

const postSimpleClient = async (req, res = response) => {
	try {
		const {
			password,
			email,
			recommendation,
			phone,
			name,
			lastName,
			clientCategory,
			clientType,
			cuit,
			address,
		} = req.body;

		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const existPhone = await User.findOne({
			phone,
			superUser: tokenData.UserInfo.superUser,
		});
		if (existPhone && existPhone[0]) {
			logger.error({
				msg: `El teléfono ${phone} ya esta registrado`,
			});
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: `El teléfono ${phone} ya esta registrado`,
			});
		}
		const existEmail = await User.findOne({
			email,
			superUser: tokenData.UserInfo.superUser,
		});
		if (existEmail && existEmail[0]) {
			logger.error({
				msg: `El email ${email} ya esta registrado`,
			});
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: `El email ${email} ya esta registrado`,
			});
		}

		// 1- primero creo el usuario
		const salt = bcryptjs.genSaltSync();
		const newPassword = bcryptjs.hashSync(password, salt);

		const user = new User({
			role: '636a6311c2e277ca644463fb',
			name,
			lastName,
			password: newPassword,
			phone,
			email: email || '',
			verified: true,
			superUser: tokenData.UserInfo.superUser,
		});

		// Guardar en BD
		await user.save();

		// 2- segundo creo el cliente
		const client = new Client({
			user: user._id,
			clientCategory,
			clientType,
			cuit,
			active: true,
			superUser: tokenData.UserInfo.superUser,
		});

		if (recommendation) {
			const data = {
				clientId: recommendation,
				recommendedClient: client._id,
				recommendedUser: client.user,
			};
			const recomm = new Recommendation(data);

			// Guardar DB
			await recomm.save();
		}
		// Guardar DB
		await client.save();

		// 3- Si viene la dirección creo una nueva

		if (address) {
			const addressNew = new ClientAddress({
				address: address.address,
				flor: address?.flor || '',
				department: address?.department || '',
				city: address.city,
				province: address.province,
				zip: address.zip,
				phone: address?.phone || '',
				type: address.type,
				deliveryZone: address.deliveryZone,
				lat: address?.lat || null,
				lng: address?.lng || null,
				client: client._id,
				user: user._id,
				superUser: tokenData.UserInfo.superUser,
			});

			await addressNew.save();
			return res.status(200).json({
				ok: true,
				status: 200,
				data: {
					user: {
						_id: user._id,
						name: user.name,
						lastName: user.lastName,
						phone: user.phone,
					},
					client,
					address: addressNew,
				},
			});
		}

		res.status(200).json({
			ok: true,
			status: 200,
			data: {
				user: {
					_id: user._id,
					name: user.name,
					lastName: user.lastName,
					phone: user.phone,
				},
				client,
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

const deleteSimpleClient = async (req, res = response) => {
	try {
		const { id } = req.params;
		const client = await Client.findByIdAndUpdate(
			id,
			{ state: false },
			{ new: true }
		);

		const userId = client.user;
		await User.findByIdAndUpdate(userId, { state: false }, { new: true });
		await ClientAddress.updateMany(
			{ user: userId, state: true },
			{ $set: { state: false } }
		);

		res.status(200).json({
			ok: true,
			status: 200,
			userId,
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
const getClientQuantity = async (req, res = response) => {
	try {
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		const clients = await Client.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		});

		return res.status(200).json({
			ok: true,
			status: 200,
			total: clients.length,
			active: clients.filter((client) => client.active).length,
			inactive: clients.filter((client) => !client.active).length,
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

/**
 * Buscar clientes por nombre aproximado
 * GET /api/clients/search?name=palabra
 */
const searchClients = async (req, res) => {
    try {
        const { name, lastName } = req.query;
        const searchString = `${name || ''} ${lastName || ''}`.trim();

        if (!searchString || searchString.length < 2) {
            return res.status(400).json({
                ok: false,
                msg: 'Debes enviar un nombre o apellido a buscar.',
            });
        }

        // 1. Preparar expresiones regulares
        const searchWords = searchString.split(/\s+/).filter(w => w.length > 0);
        
        // Expresión para coincidencia de CUALQUIER palabra (la menos estricta) -> /Diego|Flores/i
        const looseRegex = new RegExp(searchWords.join('|'), 'i'); 
        
        // Expresión para coincidencia EXACTA de la frase completa
        const exactPhraseRegex = new RegExp(`^${searchString}$`, 'i'); // Usamos ^$ para coincidencia de campo completo

        let usuarios = [];

        // 🔎 FASE 1: Búsqueda Estricta (Frase Exacta en un solo campo)
        // Busca usuarios cuyo campo 'name' o 'lastName' COINCIDA EXACTAMENTE con la frase completa.
        usuarios = await User.find({
            $and: [
                {
                    $or: [
                        { name: exactPhraseRegex },
                        { lastName: exactPhraseRegex }
                    ]
                },
                { state: true },
                { superUser: '654974527ae94fa111479ad5' }
            ]
        }).select('_id name lastName phone superUser').limit(10);
        
        // --- 2. Fases de Búsqueda Secuenciales ---
        
        if (usuarios.length === 0 && searchWords.length > 1) {
            
            // 🔎 FASE 2: Búsqueda Combinada (Todas las palabras presentes en Name + LastName)
            // Esto resuelve el caso "Diego Flores" donde 'Diego' está en 'name' y 'Flores' en 'lastName'.
            
            // Creamos una condición $and para asegurar que CADA palabra del query esté en name O lastName.
            const combinedConditions = searchWords.map(word => {
                const wordRegex = new RegExp(word, 'i');
                return { 
                    $or: [
                        { name: wordRegex }, 
                        { lastName: wordRegex } 
                    ] 
                };
            });

            usuarios = await User.find({
                $and: [
                    ...combinedConditions, // Todas las palabras deben estar presentes
                    { state: true },
                    { superUser: '654974527ae94fa111479ad5' }
                ]
            }).select('_id name lastName phone superUser').limit(10);
        }


        if (usuarios.length === 0) {
            
            // 🔎 FASE 3: Búsqueda Flexible (Cualquier Palabra en Cualquier Campo)
            // Solo se ejecuta si las Fases 1 y 2 no encontraron nada.
            usuarios = await User.find({
                $and: [
                    {
                        $or: [
                            { name: looseRegex },
                            { lastName: looseRegex }
                        ]
                    },
                    { state: true },
                    { superUser: '654974527ae94fa111479ad5' }
                ]
            }).select('_id name lastName phone superUser').limit(10);
        }
        
        // --- 3. Procesamiento de Resultados ---

        if (usuarios.length === 0) {
            return res.json({
                ok: true,
                results: [],
            });
        }

        // extraemos IDs de usuarios
        const usersIds = usuarios.map((u) => u._id);

        // Buscar clientes asociados a esos usuarios
        const clientes = await Client.find({
            user: { $in: usersIds },
            state: true,
        })
            .populate('user', 'name lastName phone email')
            .limit(10);

        return res.json({
            ok: true,
            count: clientes.length,
            results: clientes.map((c) => ({
                id: c._id,
                nombre: `${c.user.name} ${c.user.lastName}`,
            })),
        });
    } catch (error) {
        console.error('Error en búsqueda de clientes:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado en el servidor.',
        });
    }
};
module.exports = {
	postClient,
	getClients,
	getClient,
	putClient,
	deleteClient,
	getUserClient,
	getAddressesClient,
	postSimpleClient,
	deleteSimpleClient,
	getClientQuantity,
	searchClients,
};
