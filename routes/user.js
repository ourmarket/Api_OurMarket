/* eslint-disable no-unused-vars */
const { Router } = require('express');
const {
	getUsers,
	getUser,
	postUser,
	putUser,
	deleteUser,
} = require('../controllers/user');
const {
	getUserValidations,
	postUserValidations,
	putUserValidations,
	deleteUserValidations,
	postNewAdminValidations,
} = require('../validations/user-validator');
const { allowApp } = require('../middlewares/allowApp');
const { allowRoles } = require('../middlewares/allowRoles');

const router = Router();

// publico
router.post(
	'/',
	allowApp(['dashboard']),
	allowRoles('ADMIN_ROLE'),
	postUserValidations,
	postUser
);
// solo para crear el primer administrador de cada dashboard, no pide token

router.post('/admin', postNewAdminValidations, postUser);
// privado
router.get('/', getUsers);
router.get('/:id', getUserValidations, getUser);
router.patch('/:id', putUserValidations, putUser);
// admin
router.put('/:id', putUserValidations, putUser);
router.delete('/:id', deleteUserValidations, deleteUser);

module.exports = router;
