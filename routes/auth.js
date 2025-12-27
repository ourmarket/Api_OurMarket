const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { Router } = require('express');
const { getMe } = require('../controllers/auth');
const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');


const router = Router();

/* 
/api/auth
*/

router.get('/me', ClerkExpressRequireAuth(), allowApp(['dashboard']),
    allowRoles('ADMIN_ROLE'), getMe);

module.exports = router;
