const { Router } = require('express');
const {
	getNegocios,
	getNegocio,
	postNegocio,
	putNegocio,
	deleteNegocio,
} = require('../controllers/negocio');


const router = Router();

/**
 * {{url}}/api/negocios
 */

router.get('/', getNegocios);

router.get('/:id', getNegocio);

router.post('/', postNegocio);

router.put('/:id', putNegocio);

router.delete('/:id', deleteNegocio);

module.exports = router;
