const { BillOfMaterials, Product, ManufacturingOrder } = require('../models');
const mongoose = require('mongoose');
const { generateDocumentCode } = require('../services/documentNumber.service'); // Assuming this path or need to verify where it is. It was found in services/documentNumber.service.js

class BillOfMaterialsService {
	static async create(data) {
		const { product, inputs, superUser } = data;

		// Validation: Ensure main product exists
		const mainProduct = await Product.findOne({ _id: product, superUser });
		if (!mainProduct) {
			throw new Error(
				'Producto principal no encontrado o no pertenece a la cuenta'
			);
		}

		// Validation: Ensure input products exist
		for (const input of inputs) {
			const inputProduct = await Product.findOne({
				_id: input.product,
				superUser,
			});
			if (!inputProduct) {
				throw new Error(
					`Insumo con ID ${input.product} no encontrado o incorrecto`
				);
			}
		}

		// Validation: Check if BOM already exists for this product (Optional now that we have multiple recipes)
		// Removing this check allows multiple recipes per product, but check logic if needed.
		// User requested name and code, typical for multiple variants.
		// const existing = await BillOfMaterials.findOne({ product, superUser });
		// if (existing) {
		// 	throw new Error('Ya existe una receta para este producto');
		// }

		// Generate Code automatically
		const code = await generateDocumentCode({
			tenantId: superUser,
			prefix: 'REC',
		});

		const finalData = { ...data, code };

		const bom = await BillOfMaterials.create(finalData);
		return bom.populate(['product', 'inputs.product']);
	}

	static async update(id, data, superUser) {
		const bom = await BillOfMaterials.findOne({ _id: id, superUser });
		if (!bom) throw new Error('Receta no encontrada');

		if (data.inputs) {
			for (const input of data.inputs) {
				const inputProduct = await Product.findOne({
					_id: input.product,
					superUser,
				});
				if (!inputProduct) {
					throw new Error(
						`Insumo con ID ${input.product} no encontrado o incorrecto`
					);
				}
			}
		}

		Object.assign(bom, data);
		await bom.save();
		return bom.populate(['product', 'inputs.product']);
	}

	static async getList({
		superUser,
		page = 1,
		limit = 20,
		search = '',
		isActive,
	}) {
		const skip = (page - 1) * limit;
		const query = { superUser };

		if (isActive !== undefined && isActive !== null && isActive !== '') {
			query.isActive = isActive === 'true' || isActive === true;
		}

		if (search) {
			// Find products matching name, then find BOMs with those products
			const products = await Product.find({
				superUser,
				name: { $regex: search, $options: 'i' },
			}).select('_id');

			const productIds = products.map((p) => p._id);
			// Search by BOM name OR BOM code OR Product Name
			query.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ code: { $regex: search, $options: 'i' } },
				{ product: { $in: productIds } },
			];
		}

		const [data, total] = await Promise.all([
			BillOfMaterials.find(query)
				.populate('product', 'name code unit unitCost')
				.populate('inputs.product', 'name code unit unitCost')
				.populate('outputs.product', 'name code unit unitCost')
				.skip(skip)
				.limit(limit)
				.sort({ createdAt: -1 }),
			BillOfMaterials.countDocuments(query),
		]);

		return { data, total, page, limit };
	}

	static async getById(id, superUser) {
		const bom = await BillOfMaterials.findOne({ _id: id, superUser })
			.populate('product')
			.populate('inputs.product')
			.populate('outputs.product');
		if (!bom) throw new Error('Receta no encontrada');
		return bom;
	}

	static async toggleActive(id, superUser) {
		const bom = await BillOfMaterials.findOne({
			_id: new mongoose.Types.ObjectId(id),
			superUser,
		});
		if (!bom) throw new Error('Receta no encontrada');

		bom.isActive = !bom.isActive;
		await bom.save();
		return bom;
	}

	static async getActiveRecipes(superUser) {
		return BillOfMaterials.find({ superUser, isActive: true })
			.populate('product', 'name code')
			.sort({ 'product.name': 1 }); // Or sort by name
	}

	// Helper to get BOM by product ID
	static async getByProduct(productId, superUser) {
		return BillOfMaterials.findOne({ product: productId, superUser }).populate(
			'inputs.product'
		);
	}

	static async delete(id, superUser) {
		const bom = await BillOfMaterials.findOne({ _id: id, superUser });
		if (!bom) throw new Error('Receta no encontrada');

		// Verificar si ha sido usada en alguna orden de producción
		const isUsed = await ManufacturingOrder.exists({
			billOfMaterials: id,
			superUser,
		});

		if (isUsed) {
			throw new Error(
				'Esta receta ya ha sido utilizada en órdenes de producción y no puede eliminarse. Puede desactivarla para evitar su uso futuro.'
			);
		}

		await BillOfMaterials.deleteOne({ _id: id, superUser });
		return { message: 'Receta eliminada correctamente' };
	}
}

module.exports = BillOfMaterialsService;
