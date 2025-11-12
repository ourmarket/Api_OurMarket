const { response } = require('express');
const { Negocio } = require('../models');
const { getTokenData } = require('../helpers');
const { logger } = require('../helpers/logger');

const getNegocios = async (req, res = response) => {
	try {
		const jwt = req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);
		console.log('tokenData');
		console.log(req.cookies.jwt_deliveryApp);

		const negocios = await Negocio.find({
			state: true,
			superUser: tokenData.UserInfo.superUser,
		}).populate('cargadoPor');

		return res.status(200).json({
			ok: true,
			status: 200,
			total: negocios.length,
			negocios,
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

const getNegocio = async (req, res = response) => {
	try {
		const { id } = req.params;
		const negocio = await Negocio.findById(id).populate('cargadoPor');

		return res.status(200).json({
			ok: true,
			status: 200,
			negocio,
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

const postNegocio = async (req, res = response) => {
	try {
		const {
			nombreNegocio,
			nombreDueño,
			direccion,
			telefono,
			categoria,
			horarioApertura,
			horarioCierre,
			potencial,
			fueVisitado,
			esCliente,
			vendeNuestrasCategorias,
			productosQueCompra,
			productosQueLeInteresan,
			distribuidorActual,
			lat,
			lng,
		} = req.body;
		const jwt =
			req.cookies.jwt_dashboard ||
			req.cookies.jwt_tpv ||
			req.cookies.jwt_deliveryApp;
		const tokenData = getTokenData(jwt);

		// Generar la data a guardar
		const data = {
			nombreNegocio,
			nombreDueño,
			direccion,
			telefono,
			categoria,
			horarioApertura,
			horarioCierre,
			potencial,
			fueVisitado,
			esCliente,
			vendeNuestrasCategorias,
			lat,
			lng,
			productosQueCompra,
			productosQueLeInteresan,
			distribuidorActual,

			cargadoPor: tokenData.UserInfo.id,
			superUser: tokenData.UserInfo.superUser,
		};

		const negocio = new Negocio(data);

		// Guardar DB
		await negocio.save();

		return res.status(201).json({
			ok: true,
			status: 200,
			negocio,
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

const putNegocio = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { state, user, ...data } = req.body;

		data.user = req.user;

		const negocio = await Negocio.findByIdAndUpdate(id, data, { new: true });

		return res.status(200).json({
			ok: true,
			status: 200,
			negocio,
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

const deleteNegocio = async (req, res = response) => {
	try {
		const { id } = req.params;
		await Negocio.findByIdAndUpdate(id, { state: false }, { new: true });

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Categoria borrada',
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
	getNegocios,
	getNegocio,
	postNegocio,
	putNegocio,
	deleteNegocio,
};
