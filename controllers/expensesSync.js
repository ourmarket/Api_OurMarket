const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { response } = require('express');
const { getExpensesModel } = require('../helpers/expensesModelFactory');
const { getSuperUserFromRequest } = require('../helpers/getSuperUserFromRequest');
const { logger } = require('../helpers/logger');

/**
 * Converts Google Sheets URL or raw URL to direct .xlsx export link
 */
const convertToExportUrl = (rawUrl = '') => {
	let url = String(rawUrl).trim();
	const googleSheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
	if (googleSheetMatch && googleSheetMatch[1]) {
		const sheetId = googleSheetMatch[1];
		return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
	}
	return url;
};

/**
 * Maps concept to category and type
 */
const classifyConcept = (rawConcept = '') => {
	const c = String(rawConcept).trim().toUpperCase();

	if (['EDENOR', 'MOVISTAR', 'AGUA', 'ATMOSFERICO', 'AFIP', 'ARBA', 'FUMIGACION'].includes(c)) {
		return { category: 'Servicios/Impuestos', type: 'FIJO', isProrated: false };
	}
	if (['ALQUILER', 'SEGURO'].includes(c)) {
		return { category: 'Alquiler/Seguro', type: 'FIJO', isProrated: false };
	}
	if (['PRORRATEO CAMIONETA', 'CAMIONETA'].includes(c)) {
		return { category: 'Camioneta', type: 'FIJO', isProrated: true };
	}
	if (c.includes('SUELDO')) {
		return { category: 'Sueldos', type: 'VARIABLE', isProrated: false };
	}
	if (c.includes('GASOIL') || c.includes('COMBUSTIBLE')) {
		return { category: 'Combustible', type: 'VARIABLE', isProrated: false };
	}
	if (['MANTENIMIENTO', 'FERRETERIA', 'MECANICO', 'GOMERIA', 'ELASTICO'].some((k) => c.includes(k))) {
		return { category: 'Mantenimiento', type: 'VARIABLE', isProrated: false };
	}
	if (['LOGISTICA', 'REPARTO', 'BOLSAS', 'ART LIMPIESA', 'PRODUCTOS LIMPIESA', 'REFRIGERIO'].some((k) => c.includes(k))) {
		return { category: 'Insumos/Logistica', type: 'VARIABLE', isProrated: false };
	}
	return { category: 'Otros', type: 'VARIABLE', isProrated: false };
};

/**
 * Converts Excel date serial or string to JS Date
 */
const parseExcelDate = (excelDate) => {
	if (!excelDate) return null;
	if (typeof excelDate === 'number') {
		const utcDays = Math.floor(excelDate - 25569);
		const utcValue = utcDays * 86400;
		const dateInfo = new Date(utcValue * 1000);
		return new Date(Date.UTC(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate(), 12, 0, 0));
	}
	const parsed = new Date(excelDate);
	return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * POST /api/expenses/sync-excel
 * Synchronizes Sheet 1 (GASTOS FIJOS VARIABLES) with MongoDB from file, URL or local file
 */
const syncExpensesFromExcel = async (req, res = response) => {
	const startTime = Date.now();
	try {
		const { superUserId } = await getSuperUserFromRequest(req);

		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'Usuario no autenticado o superUser no encontrado',
			});
		}

		let workbook;
		let sourceOrigin = 'EXCEL_LOCAL';

		// Option 1: URL provided (e.g. Google Sheets)
		if (req.body?.url) {
			sourceOrigin = 'GOOGLE_SHEETS_URL';
			const downloadUrl = convertToExportUrl(req.body.url);
			try {
				const fetchRes = await fetch(downloadUrl, {
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
					},
					redirect: 'follow',
				});
				if (!fetchRes.ok) {
					return res.status(400).json({
						ok: false,
						status: 400,
						msg: `No se pudo descargar la planilla desde la URL proporcionada (HTTP ${fetchRes.status}). Verifique que el documento de Google Sheets tenga permisos para "Cualquier persona con el enlace".`,
					});
				}
				const arrayBuffer = await fetchRes.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);
				workbook = XLSX.read(buffer, { type: 'buffer' });
			} catch (fetchErr) {
				return res.status(400).json({
					ok: false,
					status: 400,
					msg: `Error al acceder a la URL: ${fetchErr.message}`,
				});
			}
		}
		// Option 2: Uploaded file
		else if (req.files && req.files.excel) {
			sourceOrigin = 'EXCEL_UPLOAD';
			const file = req.files.excel;
			workbook = XLSX.read(file.data, { type: 'buffer' });
		}
		// Option 3: Local file on server
		else {
			const rootExcelPath = path.resolve(__dirname, '../../FINANZAS RINGO AGROMARKET .xlsx');
			if (fs.existsSync(rootExcelPath)) {
				workbook = XLSX.readFile(rootExcelPath);
			} else {
				return res.status(400).json({
					ok: false,
					status: 400,
					msg: 'No se envió ningún archivo ni URL, y no se encontró el archivo por defecto en el servidor.',
				});
			}
		}

		// Find Sheet 1
		const sheetNames = workbook.SheetNames;
		const sheetName =
			sheetNames.find((s) => s.trim().toUpperCase() === 'GASTOS FIJOS VARIABLES') ||
			sheetNames[0];

		const worksheet = workbook.Sheets[sheetName];
		if (!worksheet) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: `No se encontró la hoja "GASTOS FIJOS VARIABLES" en la planilla.`,
			});
		}

		const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
		if (rows.length <= 1) {
			return res.status(400).json({
				ok: false,
				status: 400,
				msg: 'La hoja de gastos no contiene filas de datos.',
			});
		}

		// Parse data rows
		const dayConceptCounter = {};
		const validOperations = [];
		const validSyncKeys = [];

		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			const [rawDate, rawYear, rawMonth, rawConcept, rawTotal] = row;
			if (!rawDate && !rawConcept && !rawTotal) continue;

			const dateObj = parseExcelDate(rawDate);
			if (!dateObj) continue;

			const concept = String(rawConcept || '').trim();
			if (!concept) continue;

			const amount = Number(rawTotal) || 0;
			const dateStr = dateObj.toISOString().split('T')[0];

			const dayKey = `${dateStr}_${concept.toUpperCase()}`;
			dayConceptCounter[dayKey] = (dayConceptCounter[dayKey] || 0) + 1;
			const occurrence = dayConceptCounter[dayKey];

			const syncKey = `${superUserId}_${dayKey}_${occurrence}`;
			validSyncKeys.push(syncKey);
			const { category, type, isProrated } = classifyConcept(concept);

			const doc = {
				expensesName: concept,
				category,
				type,
				paymentMethod: 'EFECTIVO',
				amount,
				date: dateObj,
				year: Number(rawYear) || dateObj.getUTCFullYear(),
				month: String(rawMonth || '').trim().toLowerCase() || undefined,
				isProrated,
				source: 'EXCEL_SYNC',
				syncKey,
				state: true,
				superUser: superUserId,
			};

			validOperations.push({
				updateOne: {
					filter: { superUser: superUserId, syncKey },
					update: { $set: doc },
					upsert: true,
				},
			});
		}

		const ExpensesModel = getExpensesModel();
		let totalUpserted = 0;
		let totalModified = 0;
		let totalMatched = 0;

		const batchSize = 500;
		for (let i = 0; i < validOperations.length; i += batchSize) {
			const batch = validOperations.slice(i, i + batchSize);
			const result = await ExpensesModel.bulkWrite(batch, { ordered: false });
			totalUpserted += result.upsertedCount || 0;
			totalModified += result.modifiedCount || 0;
			totalMatched += result.matchedCount || 0;
		}

		// Reconcile deleted rows: deactivate any EXCEL_SYNC records that were removed from the spreadsheet
		const deleteResult = await ExpensesModel.updateMany(
			{
				superUser: superUserId,
				source: 'EXCEL_SYNC',
				syncKey: { $nin: validSyncKeys },
				state: true,
			},
			{
				$set: { state: false },
			}
		);
		const totalDeleted = deleteResult.modifiedCount || 0;

		const durationMs = Date.now() - startTime;

		return res.status(200).json({
			ok: true,
			status: 200,
			msg: 'Sincronización de Gastos completada con éxito',
			data: {
				totalRowsProcessed: validOperations.length,
				insertedCount: totalUpserted,
				modifiedCount: totalModified,
				deletedCount: totalDeleted,
				matchedCount: totalMatched,
				durationMs,
				sourceOrigin,
				modelVersion: process.env.EXPENSES_MODEL_VERSION || 'v2',
				collection: ExpensesModel.collection.name,
			},
		});
	} catch (error) {
		logger.error(error);
		return res.status(500).json({
			ok: false,
			status: 500,
			msg: `Error durante la sincronización: ${error.message}`,
		});
	}
};

/**
 * GET /api/expenses/export-excel
 * Exports expenses from DB to Excel matching Sheet 1 format
 */
const exportExpensesToExcel = async (req, res = response) => {
	try {
		const { superUserId } = await getSuperUserFromRequest(req);

		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'Usuario no autenticado',
			});
		}

		const ExpensesModel = getExpensesModel();
		const expenses = await ExpensesModel.find({
			state: true,
			superUser: superUserId,
		}).sort({ date: 1, createdAt: 1 });

		const header = ['FECHA', 'AÑO', 'MES', 'SERVICIOS / GASTOS LOCAL', 'TOTAL'];
		const rows = [header];

		expenses.forEach((item) => {
			const d = new Date(item.date);
			const day = String(d.getUTCDate()).padStart(2, '0');
			const month = String(d.getUTCMonth() + 1).padStart(2, '0');
			const year = d.getUTCFullYear();
			const dateFormatted = `${day}/${month}/${year}`;

			rows.push([
				dateFormatted,
				item.year || year,
				item.month || '',
				item.expensesName || '',
				item.amount || 0,
			]);
		});

		const ws = XLSX.utils.aoa_to_sheet(rows);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'GASTOS FIJOS VARIABLES');

		const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

		res.setHeader(
			'Content-Disposition',
			'attachment; filename="GASTOS_FIJOS_VARIABLES_SINCRONIZADO.xlsx"'
		);
		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		);
		return res.send(buffer);
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
	syncExpensesFromExcel,
	exportExpensesToExcel,
};
