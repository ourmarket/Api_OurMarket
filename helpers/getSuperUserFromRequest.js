const { getTokenData } = require('./generar-jwt');
const { ObjectId } = require('mongoose').Types;
const User = require('../models/user');

/**
 * Extracts superUserId from request (header x-token, cookies, Authorization, or decoded JWT)
 * @param {import('express').Request} req
 * @returns {Promise<{ superUserId: string, superUserObjectId: ObjectId, userId: string }>}
 */
const getSuperUserFromRequest = async (req) => {
	const token =
		req.header?.('x-token') ||
		req.cookies?.jwt_dashboard ||
		req.cookies?.jwt_tpv ||
		req.cookies?.jwt_deliveryApp ||
		req.headers?.authorization?.replace('Bearer ', '');

	if (!token && !req.user && !req.superUser) {
		return { superUserId: null, superUserObjectId: null, userId: null };
	}

	if (req.superUser) {
		const superUserId = String(req.superUser);
		return {
			superUserId,
			superUserObjectId: new ObjectId(superUserId),
			userId: req.user ? String(req.user) : null,
		};
	}

	const tokenData = getTokenData(token);
	let superUserId =
		tokenData?.UserInfo?.superUser ||
		tokenData?.data?.UserInfo?.superUser ||
		tokenData?.superUser;
	let userId =
		tokenData?.UserInfo?.id ||
		tokenData?.data?.UserInfo?.id ||
		tokenData?.id ||
		req.user;

	// If superUser is still not in tokenData but we have userId, look up user in DB
	if (!superUserId && userId) {
		try {
			const user = await User.findById(userId).select('superUser');
			if (user?.superUser) {
				superUserId = user.superUser.toString();
			}
		} catch (e) {
			// ignore lookup error
		}
	}

	return {
		superUserId: superUserId ? String(superUserId) : null,
		superUserObjectId: superUserId ? new ObjectId(superUserId) : null,
		userId: userId ? String(userId) : null,
	};
};

module.exports = {
	getSuperUserFromRequest,
};
