const Category = require('./category');
const ProductLegacy = require('./productLegacy');
const Role = require('./role');
const Server = require('./server');
const User = require('./user');
const Order = require('./order');
const Supplier = require('./supplier');
const Product = require('./product');
const Ofert = require('./ofert');
const DeliveryZone = require('./deliveryZone');
const DeliverySubZone = require('./deliverySubZone');
const Client = require('./client');
const ClientCategory = require('./clientCategory');
const ClientType = require('./clientType');
const Distributor = require('./distributor');
const DeliveryTruck = require('./deliveryTruck');
const Employee = require('./employee');
const Salary = require('./salary');
const Sale = require('./sale');
const ClientAddress = require('./clientAddress');
const Points = require('./points');
const Recommendation = require('./recommendation');
const Config = require('./config');
const Expenses = require('./expenses');
const SuperUser = require('./superUser');
const CashierSession = require('./cashierSession');
const Buy = require('./buy');
const Stock = require('./stock');
const Negocio = require('./negocio');
const OrderLegacy = require('./orderLegacy');
const StockMovement = require('./stockMovement');
const BuyLegacy = require('./buyLegacy');
const GoodsReceipt = require('./goodsReceipt');
const PurchaseOrder = require('./purchaseOrder');
const Counter = require('./counter');

const BuySummary = require('./buySummary');
const PurchaseAdjustment = require('./purchaseAdjustment');
const Warehouse = require('./warehouse');
const InventoryAdjustment = require('./inventoryAdjustment');
const ProductAuditLog = require('./productAuditLog');
const BillOfMaterials = require('./billOfMaterials');
const ProductionCostSnapshot = require('./productionCostSnapshot');
const ManufacturingOrder = require('./manufacturingOrder');

module.exports = {
	ManufacturingOrder,
	ProductionCostSnapshot,
	BillOfMaterials,
	ProductAuditLog,
	Warehouse,
	InventoryAdjustment,
	PurchaseAdjustment,
	Counter,
	PurchaseOrder,
	GoodsReceipt,
	BuyLegacy,
	StockMovement,
	OrderLegacy,
	Category,
	ProductLegacy,
	Role,
	Server,
	User,
	Order,
	Supplier,
	Product,
	Ofert,
	DeliveryZone,
	DeliverySubZone,
	Client,
	ClientCategory,
	ClientType,
	Distributor,
	DeliveryTruck,
	Employee,
	Salary,
	Sale,
	ClientAddress,
	Points,
	Recommendation,
	Config,
	Expenses,
	SuperUser,
	CashierSession,
	Buy,
	Stock,
	Negocio,
	BuySummary,
};
