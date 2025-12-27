/* eslint-disable camelcase */
const { Router } = require('express');
const {
	reportTotalOrdersByDay,
	reportNewClientByMonth,
	reportTotalOrdersProductsByDay,
	reportTotalOrdersProductsByRange,
	reportTotalOrdersProductsByRangeTest,
	reportPaymentByRangeDay,
	reportTotalOrders21_03,
	reportTotalStock,
	reportTotalClientBuyByRangeDays,
	reportTotalClientBuyIndividual,
	reportTotalClientBuyIndividualByDay,
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
	clientTotalPaymentsReport,
	clientTotalDebt,
} = require('../controllers/reports/clientsReport');

const {
	salesPaymentByLastXdayReport,
	salesTotalProductsReport,
	salesByRangeDayReport,
	salesTotalsByMonth,
} = require('../controllers/reports/saleReport');
const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');

const router = Router();

// /api/reports

// nuevas rutas con querys
// category
router.get('/category/:category', getCategoryReport);
router.get('/category/orderByDay/:category', getCategoryReportByDay);

//Sales (ex orders) - dashboard

router.get(
	'/paymentByLastXdayReport',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	salesPaymentByLastXdayReport
);
router.get(
	'/totalOrderProducts',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	salesTotalProductsReport
);
router.post(
	'/reportTotalSellByRangeDay',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	salesByRangeDayReport
);

router.get(
	'/ordersByMonth',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	salesTotalsByMonth
);

router.get('/ordersByDay', reportTotalOrdersByDay);

router.get('/totalOrderProducts21_03', reportTotalOrders21_03);

router.get('/totalOrderProductsByDay', reportTotalOrdersProductsByDay);
router.get('/totalOrderProductsByRange', reportTotalOrdersProductsByRange);
router.post(
	'/totalOrderProductsByRangeTest',
	reportTotalOrdersProductsByRangeTest
);

router.get('/newClientByMonth', reportNewClientByMonth);

router.post('/reportPaymentByRangeDay', reportPaymentByRangeDay);

// stock
router.get('/reportTotalStock', reportTotalStock);

// clients
router.get(
	'/clients/reportTotalClientBuy',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	clientTotalPaymentsReport
);
router.get(
	'/clients/reportTotalClientDebt',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	clientTotalDebt
);

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

module.exports = router;
