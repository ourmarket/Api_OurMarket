const { Router } = require('express');
const {
	getNegocios,
	getNegocio,
	postNegocio,
	putNegocio,
	deleteNegocio,
} = require('../controllers/negocio');
const verifyJWT = require('../middlewares/verifyJWT');

const router = Router();

/**
 * {{url}}/api/negocios
 */

router.get('/', verifyJWT, getNegocios);

router.get('/:id', verifyJWT, getNegocio);

router.post('/', verifyJWT, postNegocio);

router.put('/:id', verifyJWT, putNegocio);

router.delete('/:id', verifyJWT, deleteNegocio);

module.exports = router;
