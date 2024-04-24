/* eslint-disable no-prototype-builtins */

function adjustStock(
	quantity,
	newQuantity,
	availableStockArr,
	modifyStockArr,
	originalCost
) {
	// Clonar los arrays originales para no modificarlos directamente
	const availableStock = availableStockArr.map((item) => ({ ...item }));
	const modifyStock = modifyStockArr.map((item) => ({ ...item }));

	let remainingQuantity = newQuantity - quantity;

	if (remainingQuantity > 0) {
		// Reducir de availableStock
		for (let i = 0; i < availableStock.length; i++) {
			const item = availableStock[i];
			if (remainingQuantity <= item.stock) {
				item.stock -= remainingQuantity;
				if (item.hasOwnProperty('modify')) {
					item.modify += remainingQuantity;
				} else {
					item.modify = remainingQuantity;
				}
				remainingQuantity = 0;
				break;
			} else {
				remainingQuantity -= item.stock;
				if (item.hasOwnProperty('modify')) {
					item.modify += item.stock;
				} else {
					item.modify = item.stock;
				}
				item.stock = 0;
			}
		}
	} else if (remainingQuantity < 0) {
		// Aumentar en modifyStock
		for (let i = modifyStock.length - 1; i >= 0; i--) {
			const item = modifyStock[i];
			const spaceAvailable = item.quantity - item.stock;
			if (spaceAvailable > 0) {
				const quantityToAdd = Math.min(-remainingQuantity, spaceAvailable);
				item.stock += quantityToAdd;
				item.modify -= quantityToAdd;
				remainingQuantity += quantityToAdd;
			}
			if (remainingQuantity === 0) break;
		}
	}

	// Calcular el nuevo costo unitario
	let totalModify = 0;
	let totalCost = 0;
	if (newQuantity - quantity > 0) {
		const stk = availableStock.concat(modifyStock);
		stk.forEach((item) => {
			if (item.modify) {
				totalModify += item.modify;
				totalCost += item.unitCost * item.modify;
			}
		});
	}
	if (newQuantity - quantity < 0) {
		modifyStock.forEach((item) => {
			if (item.modify) {
				totalModify += item.modify;
				totalCost += item.unitCost * item.modify;
			}
		});
	}
	if (newQuantity - quantity === 0) {
		return { availableStock, modifyStock, unitCost: originalCost };
	}
	const newUnitCost = totalModify !== 0 ? totalCost / totalModify : 0;

	return {
		availableStock,
		modifyStock,
		unitCost: parseFloat(newUnitCost.toFixed(2)),
	};
}

function mergeArrays(arr1, arr2) {
	const result = [];

	// Crear un mapa para almacenar temporalmente los elementos por stockId
	const map = new Map();

	// Iterar sobre el primer array
	arr1.forEach((item) => {
		if (item.modify !== undefined) {
			// Si el elemento tiene la propiedad modify, lo agregamos al resultado
			if (!map.has(item.stockId)) {
				// Si el mapa no tiene aún un elemento con el mismo stockId, lo agregamos
				map.set(item.stockId, { ...item });
			} else {
				// Si ya existe un elemento con el mismo stockId, sumamos los valores de modify y actualizamos el stock restando
				const existingItem = map.get(item.stockId);
				existingItem.modify += item.modify;
				existingItem.stock -= item.modify;
			}
		}
	});

	// Iterar sobre el segundo array
	arr2.forEach((item) => {
		if (item.modify !== undefined) {
			// Si el elemento tiene la propiedad modify, lo agregamos al resultado
			if (!map.has(item.stockId)) {
				// Si el mapa no tiene aún un elemento con el mismo stockId, lo agregamos
				map.set(item.stockId, { ...item });
			} else {
				// Si ya existe un elemento con el mismo stockId, sumamos los valores de modify y actualizamos el stock restando
				const existingItem = map.get(item.stockId);
				existingItem.modify += item.modify;
				existingItem.stock -= item.modify;
			}
		}
	});

	// Convertir el mapa de nuevo a un array y agregarlo al resultado
	map.forEach((value) => result.push(value));

	return result;
}

function calculateAverageUnityCost(stockArray) {
	const totalUnityCost = [];
	let totalCount = 0;
	const filterArr = stockArray.filter((stock) => stock.modify);

	filterArr.forEach((item) => {
		totalCount += item.modify;
		totalUnityCost.push(item.unityCost * item.modify);
	});

	const totalProm =
		totalUnityCost.reduce((acc, curr) => acc + curr, 0) / totalCount;
	return parseFloat(totalProm.toFixed(2));
}

function sortByCreatedAt(arr) {
	return arr
		.slice()
		.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function updateStockFunction(stock, rest) {
	const stockUpdate = stock.map((item) => ({
		_id: item._id,
		product: item.product,
		quantity: item.quantity,
		cost: item.cost,
		unityCost: item.unityCost,
		stock: item.stock,
		createdAt: item.createdAt,
	}));
	let remainingRest = rest;

	for (let i = 0; i < stockUpdate.length && remainingRest > 0; i++) {
		const item = { ...stockUpdate[i] }; // Crear una nueva copia del objeto
		const stockToSubtract = Math.min(item.stock, remainingRest);
		item.stock -= stockToSubtract;
		item.modify = stockToSubtract; // Agregar el campo modify
		remainingRest -= stockToSubtract;
		stockUpdate[i] = item; // Reemplazar el objeto original con la copia modificada
	}

	return stockUpdate.filter((item) => item.modify);
}

function compareOrderItems(oldItems, newItems) {
	/* 
Recibe como parámetro orderItems anterior y modificado
Ej de retorno:
[
  { productId: '10', quantityDifference: 2, oldQuantity: 3 },
  { productId: '11', quantityDifference: -9, oldQuantity: 9 }
]
*/

	const modifiedItems = [];

	// Iterar sobre los elementos de oldItems
	oldItems.forEach((oldItem) => {
		// Buscar el elemento correspondiente en newItems
		const newItem = newItems.find(
			(item) => item.productId.toString() === oldItem.productId.toString()
		);

		// Si se encuentra el elemento correspondiente
		if (newItem) {
			// Calcular la diferencia en la cantidad
			const quantityDifference = newItem.totalQuantity - oldItem.totalQuantity;

			// Si la cantidad ha cambiado, añadir a modifiedItems
			if (quantityDifference !== 0) {
				modifiedItems.push({
					productId: oldItem.productId,
					quantityDifference,
					originalUnitCost: oldItem.unitCost,
				});
			}
		}
	});

	return modifiedItems;
}

module.exports = {
	adjustStock,
	sortByCreatedAt,
	mergeArrays,
	calculateAverageUnityCost,
	updateStockFunction,
	compareOrderItems,
};
