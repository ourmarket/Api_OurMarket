/* eslint-disable no-unused-vars */
const { Router } = require('express');
const {
	getUsers,
	getUser,
	postUser,
	putUser,
	deleteUser,
	getUserVerify,
	putUserChangePassword,
} = require('../controllers/user');
const {
	getUserValidations,
	postUserValidations,
	putUserValidations,
	deleteUserValidations,
	getUsersValidations,
} = require('../validations/user-validator');

const router = Router();

// publico
router.post('/', postUserValidations, postUser);
// privado
router.get('/', getUsers);
router.get('/:id', getUserValidations, getUser);
router.patch('/:id', putUserValidations, putUser);
// admin
router.put('/:id', putUserValidations, putUser);
router.put('/change-password/:id', putUserValidations, putUserChangePassword);
router.delete('/:id', deleteUserValidations, deleteUser);
// verify
router.get('/verify/:token', getUserVerify);

module.exports = router;
