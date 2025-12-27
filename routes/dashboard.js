const { Router } = require('express');
const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');
const { ClientsTopSummaryReport } = require('../controllers/dashboard/Clients');
const {
	getMonthlySalesChart,
	getPaymentsAndDebtChart,
	getProfitsChart,
} = require('../controllers/dashboard/Charts');
const { salesTotalReport } = require('../controllers/dashboard/Stats');
const { reportTotalBuy } = require('../controllers/dashboard/Buy');

const router = Router();

/**
 * {{url}}/api/dashboard
 */

//stats
router.get(
	'/salesTotal',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	salesTotalReport
);

// charts
router.get(
	'/chart1',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	getPaymentsAndDebtChart
);
router.get(
	'/chart2',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	getProfitsChart
);
router.get(
	'/chartDaily',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	getMonthlySalesChart
);
//clients
router.get(
	'/clients',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	ClientsTopSummaryReport
);
// buys
router.get(
	'/totalBuys',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	reportTotalBuy
);

module.exports = router;
