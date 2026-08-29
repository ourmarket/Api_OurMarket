const { response } = require('express');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Order = require('../../models/order');
const ExpenseV2 = require('../../models/expensesV2');
const Product = require('../../models/product');
const { getSuperUserFromRequest } = require('../../helpers/getSuperUserFromRequest');

const getProfitabilityReport = async (req, res = response) => {
	try {
		const { superUserId } = await getSuperUserFromRequest(req);
		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No se encontró el superUser en la sesión',
			});
		}

		const { startDate, endDate, groupBy = 'day' } = req.query;

		// Default date range: current month if not provided
		const now = new Date();
		const start = startDate
			? new Date(startDate)
			: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
		const end = endDate
			? new Date(endDate)
			: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

		const superUserObjId = new mongoose.Types.ObjectId(superUserId);

		// 1. Fetch Orders in range
		const orders = await Order.find({
			superUser: superUserObjId,
			state: true,
			$or: [
				{ deliveryDate: { $gte: start, $lte: end } },
				{ createdAt: { $gte: start, $lte: end }, deliveryDate: null },
			],
		}).lean();

		// 2. Fetch Expenses in range
		const expenses = await ExpenseV2.find({
			superUser: superUserObjId,
			state: true,
			date: { $gte: start, $lte: end },
		}).lean();

		// Helper to format date key based on groupBy
		const getPeriodKey = (d) => {
			const dt = new Date(d);
			const y = dt.getFullYear();
			const m = String(dt.getMonth() + 1).padStart(2, '0');
			const day = String(dt.getDate()).padStart(2, '0');

			if (groupBy === 'month') {
				return `${y}-${m}`;
			}
			if (groupBy === 'week') {
				// Approximate ISO week start (Monday)
				const dayOfWeek = (dt.getDay() + 6) % 7;
				const monday = new Date(dt);
				monday.setDate(dt.getDate() - dayOfWeek);
				const monDay = String(monday.getDate()).padStart(2, '0');
				const monMonth = String(monday.getMonth() + 1).padStart(2, '0');
				return `Semana ${monDay}/${monMonth}/${monday.getFullYear()}`;
			}
			return `${y}-${m}-${day}`;
		};

		// Product Master lookup for fallback costs
		const productsMaster = await Product.find({
			superUser: superUserObjId,
			state: true,
		}).lean();
		const productCostMap = {};
		productsMaster.forEach((p) => {
			if (p._id) productCostMap[p._id.toString()] = p.cost || 0;
		});

		// Aggregate Timeline & Product Breakdowns
		const timelineMap = {};
		const productMap = {};

		let totalRevenue = 0;
		let totalCost = 0;

		orders.forEach((order) => {
			const orderDate = order.deliveryDate || order.createdAt;
			const periodKey = getPeriodKey(orderDate);

			if (!timelineMap[periodKey]) {
				timelineMap[periodKey] = {
					period: periodKey,
					date: orderDate,
					revenue: 0,
					cost: 0,
					grossProfit: 0,
					expenses: 0,
					fixedExpenses: 0,
					variableExpenses: 0,
					netProfit: 0,
					orderCount: 0,
				};
			}

			let orderRevenue = order.total || 0;
			let orderCost = 0;

			if (Array.isArray(order.orderItems)) {
				order.orderItems.forEach((item) => {
					const qty = Number(item.totalQuantity) || 0;
					const itemRev = Number(item.totalPrice) || (qty * (Number(item.unitPrice) || 0));
					
					// Determine unit cost
					let itemUnitCost = Number(item.unitCost) || 0;
					if (itemUnitCost === 0 && item.stockData && item.stockData.length > 0) {
						itemUnitCost = Number(item.stockData[0].unitCost) || 0;
					}
					if (itemUnitCost === 0 && item.productId) {
						itemUnitCost = productCostMap[item.productId.toString()] || 0;
					}

					const itemTotalCost = qty * itemUnitCost;
					orderCost += itemTotalCost;

					// Aggregate Product Map
					const prodName = (item.name || 'SIN NOMBRE').trim().toUpperCase();
					if (!productMap[prodName]) {
						productMap[prodName] = {
							name: prodName,
							quantity: 0,
							revenue: 0,
							cost: 0,
							grossProfit: 0,
							margin: 0,
							roi: 0,
						};
					}

					productMap[prodName].quantity += qty;
					productMap[prodName].revenue += itemRev;
					productMap[prodName].cost += itemTotalCost;
				});
			}

			timelineMap[periodKey].revenue += orderRevenue;
			timelineMap[periodKey].cost += orderCost;
			timelineMap[periodKey].orderCount += 1;

			totalRevenue += orderRevenue;
			totalCost += orderCost;
		});

		// Aggregate Expenses into timelineMap
		let totalExpenses = 0;
		let fixedExpenses = 0;
		let variableExpenses = 0;

		expenses.forEach((exp) => {
			const expDate = exp.date;
			const periodKey = getPeriodKey(expDate);
			const amt = Number(exp.amount) || 0;
			const isFixed = exp.type === 'FIJO';

			if (!timelineMap[periodKey]) {
				timelineMap[periodKey] = {
					period: periodKey,
					date: expDate,
					revenue: 0,
					cost: 0,
					grossProfit: 0,
					expenses: 0,
					fixedExpenses: 0,
					variableExpenses: 0,
					netProfit: 0,
					orderCount: 0,
				};
			}

			timelineMap[periodKey].expenses += amt;
			if (isFixed) {
				timelineMap[periodKey].fixedExpenses += amt;
				fixedExpenses += amt;
			} else {
				timelineMap[periodKey].variableExpenses += amt;
				variableExpenses += amt;
			}

			totalExpenses += amt;
		});

		// Calculate gross and net profits for each timeline point
		const timeline = Object.values(timelineMap)
			.sort((a, b) => new Date(a.date) - new Date(b.date))
			.map((pt) => {
				const gross = pt.revenue - pt.cost;
				const net = gross - pt.expenses;
				const margin = pt.revenue > 0 ? (net / pt.revenue) * 100 : 0;
				const totalInvested = pt.cost + pt.expenses;
				const roi = totalInvested > 0 ? (net / totalInvested) * 100 : 0;

				return {
					...pt,
					grossProfit: Math.round(gross),
					netProfit: Math.round(net),
					netMargin: Number(margin.toFixed(2)),
					roi: Number(roi.toFixed(2)),
				};
			});

		// Calculate Product metrics
		const products = Object.values(productMap)
			.map((p) => {
				const gross = p.revenue - p.cost;
				const margin = p.revenue > 0 ? (gross / p.revenue) * 100 : 0;
				const roi = p.cost > 0 ? (gross / p.cost) * 100 : 0;

				return {
					...p,
					quantity: Number(p.quantity.toFixed(2)),
					revenue: Math.round(p.revenue),
					cost: Math.round(p.cost),
					grossProfit: Math.round(gross),
					margin: Number(margin.toFixed(2)),
					roi: Number(roi.toFixed(2)),
				};
			})
			.sort((a, b) => b.grossProfit - a.grossProfit);

		// Global KPIs
		const grossProfit = totalRevenue - totalCost;
		const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
		const netProfit = grossProfit - totalExpenses;
		const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
		const totalOutlay = totalCost + totalExpenses;
		const netROI = totalOutlay > 0 ? (netProfit / totalOutlay) * 100 : 0;

		return res.status(200).json({
			ok: true,
			status: 200,
			data: {
				kpis: {
					totalRevenue: Math.round(totalRevenue),
					totalCost: Math.round(totalCost),
					grossProfit: Math.round(grossProfit),
					grossMargin: Number(grossMargin.toFixed(2)),
					totalExpenses: Math.round(totalExpenses),
					fixedExpenses: Math.round(fixedExpenses),
					variableExpenses: Math.round(variableExpenses),
					netProfit: Math.round(netProfit),
					netMargin: Number(netMargin.toFixed(2)),
					netROI: Number(netROI.toFixed(2)),
					orderCount: orders.length,
				},
				timeline,
				products,
				dateRange: {
					start,
					end,
					groupBy,
				},
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

const exportProfitabilityToExcel = async (req, res = response) => {
	try {
		const { superUserId } = await getSuperUserFromRequest(req);
		if (!superUserId) {
			return res.status(401).json({
				ok: false,
				status: 401,
				msg: 'No se encontró el superUser en la sesión',
			});
		}

		const { startDate, endDate, groupBy = 'day' } = req.query;

		// Fetch report data internally
		req.query.groupBy = groupBy;
		const dummyRes = {
			status: () => dummyRes,
			json: (data) => data,
		};

		// Call logic
		const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
		const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
		const superUserObjId = new mongoose.Types.ObjectId(superUserId);

		const [orders, expenses, productsMaster] = await Promise.all([
			Order.find({
				superUser: superUserObjId,
				state: true,
				$or: [
					{ deliveryDate: { $gte: start, $lte: end } },
					{ createdAt: { $gte: start, $lte: end }, deliveryDate: null },
				],
			}).lean(),
			ExpenseV2.find({
				superUser: superUserObjId,
				state: true,
				date: { $gte: start, $lte: end },
			}).lean(),
			Product.find({
				superUser: superUserObjId,
				state: true,
			}).lean(),
		]);

		const productCostMap = {};
		productsMaster.forEach((p) => {
			if (p._id) productCostMap[p._id.toString()] = p.cost || 0;
		});

		const getPeriodKey = (d) => {
			const dt = new Date(d);
			const y = dt.getFullYear();
			const m = String(dt.getMonth() + 1).padStart(2, '0');
			const day = String(dt.getDate()).padStart(2, '0');
			return `${y}-${m}-${day}`;
		};

		const timelineMap = {};
		const productMap = {};

		orders.forEach((order) => {
			const orderDate = order.deliveryDate || order.createdAt;
			const periodKey = getPeriodKey(orderDate);

			if (!timelineMap[periodKey]) {
				timelineMap[periodKey] = {
					FECHA: periodKey,
					'INGRESOS VENTAS ($)': 0,
					'COSTO MERCADERIA ($)': 0,
					'GANANCIA BRUTA ($)': 0,
					'GASTOS OPERATIVOS ($)': 0,
					'GANANCIA NETA ($)': 0,
					'% MARGEN NETO': 0,
					'ROI (%)': 0,
				};
			}

			let orderRevenue = order.total || 0;
			let orderCost = 0;

			if (Array.isArray(order.orderItems)) {
				order.orderItems.forEach((item) => {
					const qty = Number(item.totalQuantity) || 0;
					const itemRev = Number(item.totalPrice) || (qty * (Number(item.unitPrice) || 0));
					let itemUnitCost = Number(item.unitCost) || 0;
					if (itemUnitCost === 0 && item.stockData && item.stockData.length > 0) {
						itemUnitCost = Number(item.stockData[0].unitCost) || 0;
					}
					if (itemUnitCost === 0 && item.productId) {
						itemUnitCost = productCostMap[item.productId.toString()] || 0;
					}

					const itemTotalCost = qty * itemUnitCost;
					orderCost += itemTotalCost;

					const prodName = (item.name || 'SIN NOMBRE').trim().toUpperCase();
					if (!productMap[prodName]) {
						productMap[prodName] = {
							PRODUCTO: prodName,
							'CANTIDAD VENDIDA': 0,
							'INGRESO TOTAL ($)': 0,
							'COSTO TOTAL ($)': 0,
							'GANANCIA BRUTA ($)': 0,
							'% MARGEN': 0,
							'ROI (%)': 0,
						};
					}

					productMap[prodName]['CANTIDAD VENDIDA'] += qty;
					productMap[prodName]['INGRESO TOTAL ($)'] += itemRev;
					productMap[prodName]['COSTO TOTAL ($)'] += itemTotalCost;
				});
			}

			timelineMap[periodKey]['INGRESOS VENTAS ($)'] += orderRevenue;
			timelineMap[periodKey]['COSTO MERCADERIA ($)'] += orderCost;
		});

		expenses.forEach((exp) => {
			const expDate = exp.date;
			const periodKey = getPeriodKey(expDate);
			const amt = Number(exp.amount) || 0;

			if (!timelineMap[periodKey]) {
				timelineMap[periodKey] = {
					FECHA: periodKey,
					'INGRESOS VENTAS ($)': 0,
					'COSTO MERCADERIA ($)': 0,
					'GANANCIA BRUTA ($)': 0,
					'GASTOS OPERATIVOS ($)': 0,
					'GANANCIA NETA ($)': 0,
					'% MARGEN NETO': 0,
					'ROI (%)': 0,
				};
			}

			timelineMap[periodKey]['GASTOS OPERATIVOS ($)'] += amt;
		});

		// Finalize timeline rows
		const timelineRows = Object.values(timelineMap)
			.sort((a, b) => new Date(a.FECHA) - new Date(b.FECHA))
			.map((row) => {
				const gross = row['INGRESOS VENTAS ($)'] - row['COSTO MERCADERIA ($)'];
				const net = gross - row['GASTOS OPERATIVOS ($)'];
				const margin = row['INGRESOS VENTAS ($)'] > 0 ? (net / row['INGRESOS VENTAS ($)']) * 100 : 0;
				const outlay = row['COSTO MERCADERIA ($)'] + row['GASTOS OPERATIVOS ($)'];
				const roi = outlay > 0 ? (net / outlay) * 100 : 0;

				return {
					FECHA: row.FECHA,
					'INGRESOS VENTAS ($)': Math.round(row['INGRESOS VENTAS ($)']),
					'COSTO MERCADERIA ($)': Math.round(row['COSTO MERCADERIA ($)']),
					'GANANCIA BRUTA ($)': Math.round(gross),
					'GASTOS OPERATIVOS ($)': Math.round(row['GASTOS OPERATIVOS ($)']),
					'GANANCIA NETA ($)': Math.round(net),
					'% MARGEN NETO': `${margin.toFixed(1)}%`,
					'ROI (%)': `${roi.toFixed(1)}%`,
				};
			});

		// Finalize product rows
		const productRows = Object.values(productMap)
			.map((p) => {
				const gross = p['INGRESO TOTAL ($)'] - p['COSTO TOTAL ($)'];
				const margin = p['INGRESO TOTAL ($)'] > 0 ? (gross / p['INGRESO TOTAL ($)']) * 100 : 0;
				const roi = p['COSTO TOTAL ($)'] > 0 ? (gross / p['COSTO TOTAL ($)']) * 100 : 0;

				return {
					PRODUCTO: p.PRODUCTO,
					'CANTIDAD VENDIDA': Number(p['CANTIDAD VENDIDA'].toFixed(2)),
					'INGRESO TOTAL ($)': Math.round(p['INGRESO TOTAL ($)']),
					'COSTO TOTAL ($)': Math.round(p['COSTO TOTAL ($)']),
					'GANANCIA BRUTA ($)': Math.round(gross),
					'% MARGEN': `${margin.toFixed(1)}%`,
					'ROI (%)': `${roi.toFixed(1)}%`,
				};
			})
			.sort((a, b) => b['GANANCIA BRUTA ($)'] - a['GANANCIA BRUTA ($)']);

		// Create Workbook with 2 sheets
		const wb = XLSX.utils.book_new();
		const wsConsolidado = XLSX.utils.json_to_sheet(timelineRows);
		const wsProductos = XLSX.utils.json_to_sheet(productRows);

		XLSX.utils.book_append_sheet(wb, wsConsolidado, 'Consolidado Financiero');
		XLSX.utils.book_append_sheet(wb, wsProductos, 'Rentabilidad por Producto');

		const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

		const filename = `REPORTE_RENTABILIDAD_GANANCIAS_${new Date().toISOString().split('T')[0]}.xlsx`;
		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		);
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="${filename}"`
		);

		return res.send(buffer);
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
	getProfitabilityReport,
	exportProfitabilityToExcel,
};
