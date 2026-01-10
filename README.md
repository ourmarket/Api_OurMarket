# Backend - OurMarket Software

## Flujos Principales y Sistema FIFO

Este documento detalla la arquitectura actual de los flujos de Compra, Stock y Manufactura, con énfasis en la integración del sistema FIFO (First-In-First-Out).

### 1. Concepto Central: Dualidad de Stock
Para balancear rendimiento y precisión contable, el sistema maneja el stock en dos capas paralelas:

*   **⚡ Capa Rápida (`Stock` Model):** 
    *   Es un simple contador (`quantityAvailable`).
    *   Se usa para consultas rápidas en POS y listas de productos.
    *   *Riesgo:* Puede desincronizarse (drift) ante errores.
*   **🛡️ Capa Precisa (`ProductLot` Model - FIFO):** 
    *   Es el registro detallado de cada lote (batch) con su costo real específico.
    *   Es la "Fuente de Verdad" financiera.
    *   Permite calcular costos reales de venta y producción.

---

### 2. Flujo de Compras (Purchase Flow)
*Objetivo: Ingresar mercadería valorizada al stock.*

1.  **Creación de Compra:** Se crea una Orden de Compra o Compra Directa (`Buy`).
2.  **Recepción (`GoodsReceipt`):**
    *   Se confirma la cantidad recibida.
    *   **Acción FIFO:** Se llama a `StockFifoService.createLot`.
        *   Crea un nuevo `ProductLot` con: Cantidad Recibida y **Costo Unitario Real de la Compra**.
        *   Tipo: `BUY`.
    *   **Inventario:** Se incrementa el contador rápido en `Stock`.
    *   **Auditoría:** Se genera un `StockMovement` (IN).

---

### 3. Flujo de Manufactura (Manufacturing Flow)
*Objetivo: Transformar materias primas (Insumos) en productos terminados, trasladando los costos.*

#### Fase A: Ejecución (Consumo de Insumos)
*   **Acción:** El operario confirma la "Ejecución" de la orden (`MO`).
*   **Proceso FIFO:**
    *   Se llama a `StockFifoService.consumeFIFO` para cada insumo.
    *   El sistema busca los lotes más antiguos de la materia prima.
    *   **Costo Real:** Si consumo 10u (5u de Lote A @ $100 y 5u de Lote B @ $120), el costo total es $1100.
    *   **Snapshot:** Se guarda este costo exacto en `ProductionCostSnapshot`.
    *   **Inventario:** Se descuentan los insumos del contador rápido `Stock`.

#### Fase B: Cierre (Alta de Producto Terminado)
*   **Acción:** Finalización de la orden.
*   **Cálculo de Costo:** Suma de Costos Reales de Insumos + Costos Auxiliares (Mano de obra, Luz, etc.).
*   **Proceso FIFO:**
    *   Se calcula el **Costo Unitario Resultante**.
    *   Se llama a `StockFifoService.createLot` para el Producto Terminado.
    *   Se crea un nuevo lote de tipo `MANUFACTURE` con ese costo unitario preciso.
    *   **Inventario:** Se suma el producto terminado al contador rápido `Stock`.

---

### 4. Flujo de Stock & Ajustes
*Objetivo: Mantener la consistencia del inventario manual.*

*   **Ajustes Manuales:** (`StockService.adjustStock`)
    *   **Si es SALIDA (Resta):** Usa `consumeFIFO`. El sistema decide qué lotes descontar (los más viejos), manteniendo la integridad del valor del inventario restante.
    *   **Si es ENTRADA (Suma):** Usa `createLot`. Crea un lote nuevo (tipo `ADJUSTMENT`). *Nota: Actualmente asigna costo $0 o manual, punto a mejorar.*

*   **Reconciliación:** (`StockReconciliationService`)
    *   Herramienta de "Autosanación".
    *   Suma todos los `ProductLots` activos.
    *   Sobreescribe el contador rápido de `Stock` con la suma real.
    *   Disponible vía endpoint `/api/stock/reconcile`.

---

### 5. Próximos Pasos: Flujo de Ventas (Sales Flow)
*(Pendiente de implementación final UI, Backend preparado)*

*   Al vender, se usará `consumeFIFO`.
*   Esto permitirá saber exactamente el **Margen de Ganancia Real** por venta (Precio Venta - Costo Real del Lote vendido), en lugar de usar un costo promedio genérico.
