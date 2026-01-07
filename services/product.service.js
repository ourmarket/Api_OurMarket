const mongoose = require('mongoose');
const { Product, ProductAuditLog } = require('../models');

class ProductService {
	/**
	 * Crea un producto y registra el log inicial
	 */
	static async createProduct(data, userId, superUserId) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const product = new Product({
				...data,
				createdBy: userId,
				lastUpdatedBy: userId,
				superUser: superUserId,
			});

			await product.save({ session });

			// Registrar auditoría
			await ProductAuditLog.create(
				[
					{
						product: product._id,
						action: 'CREATE',
						reason: data.reason || 'INITIAL_CREATION',
						priceSnapshot: {
							price: product.price,
							hasOffer: product.hasOffer,
							offerPrice: product.offerPrice,
							offerFrom: product.offerFrom,
							offerTo: product.offerTo,
						},
						createdBy: userId,
						superUser: superUserId,
					},
				],
				{ session }
			);

			await session.commitTransaction();
			return product;
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	}

	/**
	 * Actualiza un producto y registra auditoría si hay cambios
	 */
	static async updateProduct(productId, updateData, userId, superUserId) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const currentProduct = await Product.findById(productId).session(session);
			if (!currentProduct) throw new Error('Producto no encontrado');

			const changes = {};
			const fieldsToWatch = [
				'name',
				'price',
				'hasOffer',
				'offerPrice',
				'offerFrom',
				'offerTo',
				'minStock',
				'maxStock',
				'category',
				'available',
			];

			let hasChanges = false;
			fieldsToWatch.forEach((field) => {
				if (
					updateData[field] !== undefined &&
					String(currentProduct[field]) !== String(updateData[field])
				) {
					changes[field] = {
						from: currentProduct[field],
						to: updateData[field],
					};
					hasChanges = true;
				}
			});

			if (!hasChanges) {
				await session.commitTransaction();
				return currentProduct;
			}

			// Validaciones de negocio: Si cambia precio, el motivo es obligatorio
			const isPriceChanging =
				changes.price || changes.offerPrice || changes.hasOffer;
			if (isPriceChanging && !updateData.reason) {
				throw new Error('El motivo es obligatorio cuando se modifican precios');
			}

			// Actualizar producto
			Object.assign(currentProduct, updateData);
			currentProduct.lastUpdatedBy = userId;
			await currentProduct.save({ session });

			// Registrar auditoría
			await ProductAuditLog.create(
				[
					{
						product: currentProduct._id,
						action: 'UPDATE',
						changes,
						reason: updateData.reason || 'MANUAL_UPDATE',
						priceSnapshot: {
							price: currentProduct.price,
							hasOffer: currentProduct.hasOffer,
							offerPrice: currentProduct.offerPrice,
							offerFrom: currentProduct.offerFrom,
							offerTo: currentProduct.offerTo,
						},
						createdBy: userId,
						superUser: superUserId,
					},
				],
				{ session }
			);

			await session.commitTransaction();
			return currentProduct;
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	}

	/**
	 * Obtiene el historial de auditoría de un producto
	 */
	static async getProductHistory(productId, superUser, page = 1, limit = 20) {
		const skip = (page - 1) * limit;

		const [logs, total] = await Promise.all([
			ProductAuditLog.find({ product: productId, superUser })
				.populate('createdBy', 'name lastName')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			ProductAuditLog.countDocuments({ product: productId, superUser }),
		]);

		return {
			data: logs,
			total,
			page,
			limit,
		};
	}
}

module.exports = ProductService;
