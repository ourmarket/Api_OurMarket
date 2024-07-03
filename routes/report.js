/* eslint-disable camelcase */
const { Router } = require('express');
const {
	reportTotalOrdersByMonth,
	reportTotalOrdersByDay,
	reportTotalOrdersProducts,
	reportNewClientByMonth,
	reportTotalOrders,
	reportTotalOrdersProductsByDay,
	reportTotalOrdersProductsByRange,
	reportTotalOrdersProductsByRangeTest,
	reportPaymentByRangeDay,
	reportTotalSellByRangeDay,
	reportTotalOrders21_03,
	reportTotalStock,
	reportTotalClientDebt,
	reportTotalClientBuyByRangeDays,

	reportTotalClientBuyIndividual,
	reportTotalClientBuyIndividualByDay,
	reportTotalIndividualProduct,
	reportTotalIndividualProductLast30days,
} = require('../controllers/report');
const {
	getCategoryReport,
	getCategoryReportByDay,
} = require('../controllers/reports/categoryReport');
const { deliveryOrders } = require('../controllers/reports/deliveryReport');
const {
	getTotalExpensesReport,
	getByMonthExpensesReport,
	getByMonthAndCategoryExpensesReport,
	getTotalCategoryExpensesReport,
} = require('../controllers/reports/expensesReport');
const {
	paymentByLastXdayReport,
} = require('../controllers/reports/paymentsReport');
const {
	totalPaymentByClientReport,
} = require('../controllers/reports/clientsReport');
const { reportTotalBuy } = require('../controllers/reports/buyReport');

const router = Router();

// /api/reports

// nuevas rutas con querys
// category
router.get('/category/:category', getCategoryReport);
router.get('/category/orderByDay/:category', getCategoryReportByDay);

router.get('/ordersByMonth', reportTotalOrdersByMonth);
router.get('/ordersByDay', reportTotalOrdersByDay);
router.get('/orders', reportTotalOrders);

router.get('/totalOrderProducts', reportTotalOrdersProducts);
router.get('/totalOrderProducts21_03', reportTotalOrders21_03);
router.get('/totalIndividualProduct/:id', reportTotalIndividualProduct);
router.get(
	'/totalIndividualProductLast30days/:id',
	reportTotalIndividualProductLast30days
);

router.get('/totalOrderProductsByDay', reportTotalOrdersProductsByDay);
router.get('/totalOrderProductsByRange', reportTotalOrdersProductsByRange);
router.post(
	'/totalOrderProductsByRangeTest',
	reportTotalOrdersProductsByRangeTest
);

router.get('/newClientByMonth', reportNewClientByMonth);

router.post('/reportPaymentByRangeDay', reportPaymentByRangeDay);
router.post('/reportTotalSellByRangeDay', reportTotalSellByRangeDay);

// stock
router.get('/reportTotalStock', reportTotalStock);
// clients
router.get('/reportTotalClientDebt', reportTotalClientDebt);
router.get('/reportTotalClientBuy', totalPaymentByClientReport); // from 21/03/2023
router.get('/reportTotalClientBuy/:id', reportTotalClientBuyIndividual); // from 21/03/2023
router.post(
	'/reportTotalClientBuyByRangeDays',
	reportTotalClientBuyByRangeDays
);
router.get(
	'/reportTotalClientBuyByDay/:id',
	reportTotalClientBuyIndividualByDay
);

// delivery
router.post('/deliveryOrders/:id', deliveryOrders);

// expenses
router.get('/reportTotalExpenses', getTotalExpensesReport);
router.get('/reportTotalExpensesByMonth', getByMonthExpensesReport);
router.get(
	'/reportTotalExpensesByMonthAndCategory',
	getByMonthAndCategoryExpensesReport
);
router.get('/reportTotalExpensesByCategory', getTotalCategoryExpensesReport);

// payment
router.get('/paymentByLastXdayReport', paymentByLastXdayReport);

// buys
router.get('/totalBuys', reportTotalBuy);

module.exports = router;
