const { response } = require('express');
const ExpensesTemplate = require('../models/expensesTemplate');
const { getSuperUserFromRequest } = require('../helpers/getSuperUserFromRequest');

const DEFAULT_TEMPLATES_SEED = [
	{
		name: 'Planilla Diaria Habitual (Estructura de la Tabla)',
		description: 'Estructura idéntica a la planilla diaria: Edenor, Movistar, Alquiler, Camioneta, Sueldos y Gastos Varios',
		isDefault: true,
		items: [
			{ expensesName: 'EDENOR', category: 'Servicios/Impuestos', type: 'FIJO', paymentMethod: 'EFECTIVO', amount: 23000, isProrated: true },
			{ expensesName: 'MOVISTAR', category: 'Servicios/Impuestos', type: 'FIJO', paymentMethod: 'EFECTIVO', amount: 1200, isProrated: true },
			{ expensesName: 'ALQUILER', category: 'Alquiler/Seguro', type: 'FIJO', paymentMethod: 'EFECTIVO', amount: 17000, isProrated: true },
			{ expensesName: 'CAMIONETA', category: 'Camioneta', type: 'FIJO', paymentMethod: 'EFECTIVO', amount: 1000, isProrated: true },
			{ expensesName: 'SUELDOS', category: 'Sueldos', type: 'VARIABLE', paymentMethod: 'EFECTIVO', amount: 0, isProrated: false },
			{ expensesName: 'GASTOS', category: 'Otros', type: 'VARIABLE', paymentMethod: 'EFECTIVO', amount: 0, isProrated: false },
			{ expensesName: 'GASOIL', category: 'Combustible', type: 'VARIABLE', paymentMethod: 'EFECTIVO', amount: 0, isProrated: false },
		],
	},
	{
		name: 'Jornada Completa con Prorrateos Mensuales',
		description: 'Estructura con prorrateo de Alquiler ($660k/mes), Seguro ($122k/mes), Camioneta ($300k/mes) y Servicios',
		isDefault: false,
		items: [
			{ expensesName: 'ALQUILER', category: 'Alquiler/Seguro', type: 'FIJO', paymentMethod: 'EFECTIVO', amount: 22000, isProrated: true },
			{ expensesName: 'SEGURO', category: 'Alquiler/Seguro', type: 'FIJO', paymentMethod: 'EFECTIVO', amount: 4067, isProrated: true },
			{ expensesName: 'PRORRATEO CAMIONETA', category: 'Camioneta', type: 'FIJO', paymentMethod: 'EFECTIVO', amount: 10000, isProrated: true },
			{ expensesName: 'EDENOR', category: 'Servicios/Impuestos', type: 'FIJO', paymentMethod: 'EFECTIVO', amount: 15000, isProrated: false },
			{ expensesName: 'MOVISTAR', category: 'Servicios/Impuestos', type: 'FIJO', paymentMethod: 'EFECTIVO', amount: 1500, isProrated: false },
			{ expensesName: 'SUELDOS', category: 'Sueldos', type: 'VARIABLE', paymentMethod: 'EFECTIVO', amount: 0, isProrated: false },
			{ expensesName: 'GASTOS VARIOS', category: 'Otros', type: 'VARIABLE', paymentMethod: 'EFECTIVO', amount: 0, isProrated: false },
		],
	},
	{
		name: 'Solo Gastos Variables del Día',
		description: 'Solo sueldos de la jornada, combustible y gastos varios del día',
		isDefault: false,
		items: [
			{ expensesName: 'SUELDOS', category: 'Sueldos', type: 'VARIABLE', paymentMethod: 'EFECTIVO', amount: 0, isProrated: false },
			{ expensesName: 'GASOIL', category: 'Combustible', type: 'VARIABLE', paymentMethod: 'EFECTIVO', amount: 0, isProrated: false },
			{ expensesName: 'GASTOS', category: 'Otros', type: 'VARIABLE', paymentMethod: 'EFECTIVO', amount: 0, isProrated: false },
		],
	},
];

const getTemplates = async (req, res = response) => {
	try {
		const { superUserId } = await getSuperUserFromRequest(req);
		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No se encontró el superUser en la sesión',
			});
		}

		let templates = await ExpensesTemplate.find({
			superUser: superUserId,
			state: true,
		}).sort({ createdAt: 1 });

		// Auto seed default templates for new superUsers if empty
		if (!templates || templates.length === 0) {
			const seedDocs = DEFAULT_TEMPLATES_SEED.map((t) => ({
				...t,
				superUser: superUserId,
			}));
			templates = await ExpensesTemplate.insertMany(seedDocs);
		}

		return res.status(200).json({
			ok: true,
			status: 200,
			data: {
				templates,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const createTemplate = async (req, res = response) => {
	try {
		const { name, description, items, isDefault } = req.body;
		if (!name || !Array.isArray(items)) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: 'El nombre y la lista de conceptos son obligatorios',
			});
		}

		const { superUserId } = await getSuperUserFromRequest(req);
		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No se encontró el superUser en la sesión',
			});
		}

		const template = new ExpensesTemplate({
			name: name.trim(),
			description: description ? description.trim() : '',
			items: items.map((i) => ({
				expensesName: (i.expensesName || '').trim().toUpperCase(),
				category: i.category || 'Otros',
				type: i.type || 'VARIABLE',
				paymentMethod: i.paymentMethod || 'EFECTIVO',
				amount: Number(i.amount) || 0,
				isProrated: Boolean(i.isProrated),
			})),
			isDefault: Boolean(isDefault),
			superUser: superUserId,
		});

		await template.save();

		return res.status(201).json({
			ok: true,
			status: 201,
			msg: 'Plantilla creada con éxito en la base de datos',
			data: {
				template,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const updateTemplate = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { name, description, items, isDefault } = req.body;
		const { superUserId } = await getSuperUserFromRequest(req);

		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No se encontró el superUser en la sesión',
			});
		}

		const updateData = {};
		if (name) updateData.name = name.trim();
		if (description !== undefined) updateData.description = description.trim();
		if (Array.isArray(items)) {
			updateData.items = items.map((i) => ({
				expensesName: (i.expensesName || '').trim().toUpperCase(),
				category: i.category || 'Otros',
				type: i.type || 'VARIABLE',
				paymentMethod: i.paymentMethod || 'EFECTIVO',
				amount: Number(i.amount) || 0,
				isProrated: Boolean(i.isProrated),
			}));
		}
		if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);

		const template = await ExpensesTemplate.findOneAndUpdate(
			{ _id: id, superUser: superUserId },
			{ $set: updateData },
			{ new: true }
		);

		if (!template) {
			return res.status(404).json({
				ok: false,
				status: 404,
				msg: 'Plantilla no encontrada',
			});
		}

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Plantilla actualizada con éxito',
			data: {
				template,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

const deleteTemplate = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { superUserId } = await getSuperUserFromRequest(req);

		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No se encontró el superUser en la sesión',
			});
		}

		const template = await ExpensesTemplate.findOneAndUpdate(
			{ _id: id, superUser: superUserId },
			{ $set: { state: false } },
			{ new: true }
		);

		if (!template) {
			return res.status(404).json({
				ok: false,
				status: 404,
				msg: 'Plantilla no encontrada',
			});
		}

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Plantilla eliminada correctamente',
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: error.message,
		});
	}
};

module.exports = {
	getTemplates,
	createTemplate,
	updateTemplate,
	deleteTemplate,
};
