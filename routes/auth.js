const { Router } = require('express');
const { loginValidator } = require('../validations/auth/loginValidator');
const {
	loginDashboard,
	refreshDashboard,
	logoutDashboard,
} = require('../controllers/auth/authDashboard');
const {
	loginTpv,
	refreshTpv,
	logoutTpv,
} = require('../controllers/auth/authTpv');
const {
	loginDeliveryApp,
	refreshDeliveryApp,
	logoutDeliveryApp,
} = require('../controllers/auth/authDeliveryApp');
const { loginPreventas, refreshPreventas, logoutPreventas } = require('../controllers/auth/authPreventas');

const router = Router();

/* 
/api/auth
*/

// Dashboard
router.post('/dashboard/login', loginValidator, loginDashboard);
router.get('/dashboard/refresh', refreshDashboard);
router.post('/dashboard/logout', logoutDashboard);
// TPV
router.post('/tpv/login', loginValidator, loginTpv);
router.get('/tpv/refresh', refreshTpv);
router.post('/tpv/logout', logoutTpv);
// Delivery App
router.post('/deliveryApp/login', loginValidator, loginDeliveryApp);
router.get('/deliveryApp/refresh', refreshDeliveryApp);
router.post('/deliveryApp/logout', logoutDeliveryApp);
// Preventas App
router.post('/preventasApp/login', loginValidator, loginPreventas);
router.get('/preventasApp/refresh', refreshPreventas);
router.post('/preventasApp/logout', logoutPreventas);

module.exports = router;
