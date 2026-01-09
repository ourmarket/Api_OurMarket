const mongoose = require('mongoose');
const {
	ManufacturingOrder,
	BillOfMaterials,
	Product,
	ProductionCostSnapshot,
} = require('../models');
const StockService = require('./stock.service');
const { generateDocumentCode } = require('./documentNumber.service');

class ManufacturingService {
	/**
	 * Crea una orden de manufactura en estado DRAFT
	 * Puede crearse desde una receta (bomId) o con inputs/outputs manuales
	 */
	static async createOrder(data) {
		const {
			bomId,
			quantity = 1, // Cantidad de veces a ejecutar la receta
			notes,
			createdBy,
			superUser,
		} = data;

		// Generar código único
		const code = await generateDocumentCode({
			tenantId: superUser,
			prefix: 'MO', // Manufacturing Order
		});

		let inputs = [];
		let outputs = [];

		if (bomId) {
			const bom = await BillOfMaterials.findOne({
				_id: bomId,
				superUser,
			})
				.populate('inputs.product')
				.populate('outputs.product')
				.populate('product'); // Legacy field

			if (!bom) throw new Error('Receta no encontrada');
			if (!bom.isActive) throw new Error('La receta está inactiva');

			// Escalar inputs según cantidad de orden
			const ratio = quantity;

			inputs = bom.inputs.map((i) => ({
				product: i.product._id,
				quantity: i.quantity * ratio,
				unitCost: i.product.cost || 0, // Costo estimado actual
				type: 'MAIN', // Default from BOM
			}));

			// Determinar Outputs (Nuevo vs Legacy)
			if (bom.outputs && bom.outputs.length > 0) {
				// Nuevo Modelo: Múltiples Outputs (Transformación)
				outputs = bom.outputs.map((o) => ({
					product: o.product._id,
					quantity: (o.expectedQuantity || 0) * ratio, // Valor inicial estimado
					expectedQuantity: (o.expectedQuantity || 0) * ratio,
					costPercent: o.costPercent, // Heredar regla de costo
					unitCost: 0,
				}));
			} else {
				// Legacy Modelo: 1 Output Principal
				// Si no hay outputs array, usamos el campo 'product' y 'yieldQuantity'
				outputs = [
					{
						product: bom.product._id,
						quantity: bom.yieldQuantity * ratio,
						unitCost: 0,
					},
				];
			}
		} else {
			// Construcción manual
			if (data.inputs && data.outputs) {
				inputs = data.inputs;
				outputs = data.outputs;
			} else {
				throw new Error('Debe especificar una Receta (bomId) o inputs/outputs');
			}
		}

		const order = await ManufacturingOrder.create({
			code,
			status: 'DRAFT',
			inputs,
			outputs,
			notes,
			createdBy,
			superUser,
			state: true,
		});

		return order;
	}

	/**
	 * Ejecuta la orden:
	 * 1. Valida stock y estado DRAFT
	 * 2. Consume insumos (OUT) y registra sus costos (Snapshot)
	 * 3. Genera productos (IN) sin asignar costo final
	 * 4. Actualiza estado a EXECUTED
	 */
	static async executeOrder(orderId, user) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const order = await ManufacturingOrder.findOne({
				_id: orderId,
				superUser: user.superUser,
			}).session(session);

			if (!order) throw new Error('Orden no encontrada');
			if (order.status !== 'DRAFT') {
				throw new Error(
					`La orden no está en estado DRAFT (Estado actual: ${order.status})`
				);
			}

			// 1. Validar y Consumir Insumos (OUT)
			let totalInputCost = 0;
			let totalAuxCost = 0;

			for (const input of order.inputs) {
				// Obtener costo real del momento (Snapshot)
				const productDoc = await Product.findById(input.product).session(
					session
				);
				if (!productDoc)
					throw new Error(`Producto insumo ${input.product} no encontrado`);

				const currentUnitCost = productDoc.cost || 0;
				const lineCost = currentUnitCost * input.quantity;

				// Clasificar costos
				if (input.type === 'AUX') {
					totalAuxCost += lineCost;
				} else {
					totalInputCost += lineCost;
				}

				// Actualizar el costo unitario en la orden para referencia histórica
				input.unitCost = currentUnitCost;

				// Registrar movimiento STOCK OUT
				await StockService.registerMovementInternal(
					{
						stockCode: `${order.code}-IN-${input.product}`, // Identificador único movimiento
						product: input.product,
						quantity: input.quantity,
						type: 'OUT',
						reason: 'MANUFACTURING',
						reference: order._id,
						createdBy: user._id,
						superUser: user.superUser,
						meta: { orderCode: order.code, step: 'CONSUMPTION' },
					},
					session
				);

				// Crear Snapshot de Costo (Insumo)
				await ProductionCostSnapshot.create(
					[
						{
							manufacturingOrder: order._id,
							product: input.product,
							quantity: input.quantity,
							unitCost: currentUnitCost,
							totalCost: lineCost,
							type: 'INPUT',
							superUser: user.superUser,
						},
					],
					{ session }
				);
			}

			// 2. Generar Productos Resultantes (Outputs) -> Solo Movimientos
			for (const output of order.outputs) {
				// Registrar movimiento STOCK IN
				// El costo no se asigna al stock todavía
				await StockService.registerMovementInternal(
					{
						stockCode: `${order.code}-OUT-${output.product}`,
						product: output.product,
						quantity: output.quantity,
						type: 'IN',
						reason: 'MANUFACTURING',
						reference: order._id,
						createdBy: user._id,
						superUser: user.superUser,
						meta: { orderCode: order.code, step: 'PRODUCTION' },
					},
					session
				);
			}

			// 3. Actualizar Orden a EXECUTED
			order.status = 'EXECUTED';
			order.totalInputCost = totalInputCost;
			order.totalAuxCost = totalAuxCost;
			order.producedAt = new Date();

			if (order.schema && order.schema.path('executedBy'))
				order.executedBy = user._id;
			if (order.schema && order.schema.path('executedAt'))
				order.executedAt = new Date();

			await order.save({ session });

			await session.commitTransaction();
			return order;
		} catch (error) {
			await session.abortTransaction();
			console.error('Manufacturing Execution Error:', error);
			throw error;
		} finally {
			session.endSession();
		}
	}

	/**
	 * Cierra la orden (Costeo Final):
	 * 1. Valida estado EXECUTED
	 * 2. Calcula Costo Total (Input + Aux)
	 * 3. Asigna Costo Unitario a Outputs (Prorrateo por Porcentaje o por Peso)
	 * 4. Genera Snapshot de Outputs
	 * 5. Actualiza estado a CLOSED
	 */
	static async closeOrder(orderId, user) {
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const order = await ManufacturingOrder.findOne({
				_id: orderId,
				superUser: user.superUser,
			}).session(session);

			if (!order) throw new Error('Orden no encontrada');
			if (order.status !== 'EXECUTED') {
				throw new Error(
					`La orden debe estar en estado EXECUTED para cerrarse (Estado actual: ${order.status})`
				);
			}

			const totalCost = (order.totalInputCost || 0) + (order.totalAuxCost || 0);

			// Lógica de Costeo: ¿Existe algún porcentaje definido?
			// Si al menos un output tiene costPercent definido (>0), usamos la lógica de porcentajes.
			const hasCostPercent = order.outputs.some(
				(o) => o.costPercent != null && o.costPercent > 0
			);
			const totalOutputQuantity = order.outputs.reduce(
				(acc, o) => acc + o.quantity,
				0
			);

			// Actualizar Outputs con Costo
			for (const output of order.outputs) {
				let allocatedCost = 0;
				let unitCost = 0;

				if (hasCostPercent) {
					// Estrategia: Porcentaje Definido
					// Allocation = TotalCost * (Percent/100)
					const percent = output.costPercent || 0;
					allocatedCost = totalCost * (percent / 100);
				} else {
					// Estrategia: Prorrateo por Peso (Default)
					// Allocation = TotalCost * (Qty / TotalQty)
					const ratio =
						totalOutputQuantity > 0 ? output.quantity / totalOutputQuantity : 0;
					allocatedCost = totalCost * ratio;
				}

				// Costo Unitario
				unitCost = output.quantity > 0 ? allocatedCost / output.quantity : 0;

				output.unitCost = unitCost;

				// Guardar snapshot de costos
				await ProductionCostSnapshot.create(
					[
						{
							manufacturingOrder: order._id,
							product: output.product,
							quantity: output.quantity,
							unitCost: unitCost,
							totalCost: allocatedCost, // Costo total asignado
							type: 'OUTPUT',
							superUser: user.superUser,
						},
					],
					{ session }
				);
			}

			// Actualizar Orden
			order.totalCost = totalCost;
			order.status = 'CLOSED';

			if (order.schema && order.schema.path('closedBy'))
				order.closedBy = user._id;
			if (order.schema && order.schema.path('closedAt'))
				order.closedAt = new Date();

			await order.save({ session });

			await session.commitTransaction();
			return order;
		} catch (error) {
			await session.abortTransaction();
			console.error('Manufacturing Close Error:', error);
			throw error;
		} finally {
			session.endSession();
		}
	}

	static async getOrderById(id, superUser) {
		return ManufacturingOrder.findOne({ _id: id, superUser })
			.populate('inputs.product')
			.populate('outputs.product')
			.populate('createdBy', 'name lastName');
	}

	static async getList({ superUser, page = 1, limit = 20, status }) {
		const skip = (page - 1) * limit;
		const query = { superUser };
		if (status) query.status = status;

		const [data, total] = await Promise.all([
			ManufacturingOrder.find(query)
				.populate('createdBy', 'name lastName')
				.populate('inputs.product', 'name code')
				.populate('outputs.product', 'name code')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit),
			ManufacturingOrder.countDocuments(query),
		]);

		return { data, total, page, limit };
	}

	static async getCostSnapshot(orderId, superUser) {
		return ProductionCostSnapshot.find({
			manufacturingOrder: orderId,
			superUser,
		})
			.populate('product', 'name code')
			.sort({ type: 1 });
	}
}

module.exports = ManufacturingService;
