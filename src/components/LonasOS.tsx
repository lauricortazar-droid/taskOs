import React, { useState, useEffect } from "react";
import {
  Printer,
  Plus,
  Search,
  ExternalLink,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  Calendar,
  Phone,
  FileText,
  AlertCircle,
  Truck,
  RotateCcw,
  RefreshCw,
  Send,
  X,
  Share2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { LonasOrder, LonasStatus, LonasOrderItem, Contact } from "../types";
import { playChime } from "../utils/audio";
import { buildWhatsAppUrl, openWhatsAppInNewTab } from "../utils/whatsapp";

const STORAGE_KEY_LONAS = "task_os_pepe_lonas_orders_v1";

const INITIAL_LONAS_ORDERS: LonasOrder[] = [
  {
    id: "lon-101",
    folio: 101,
    cliente: {
      nombre: "Don Pepe Restaurante",
      telefono: "19999011852",
      empresa: "Restaurante Don Pepe",
    },
    items: [
      {
        id: "item-1",
        descripcion: "Lona Front 13oz con bastilla y ojillos",
        ancho: 3.0,
        alto: 1.5,
        cantidad: 1,
        m2: 4.5,
        costoPorM2: 75,
        precioVentaPorM2: 160,
        costoCalculado: 337.5,
        precioCalculado: 720,
        precioFinal: 720,
        costoFinal: 337.5,
        observaciones: "Ojillos cada 50cm, reforzar esquinas",
      },
    ],
    subtotal: 720,
    descuento: 0,
    total: 720,
    anticipo: 350,
    pagos: [
      {
        id: "pay-1",
        fecha: "2026-09-18",
        monto: 350,
        metodo: "Efectivo",
        nota: "Anticipo 50% al levantar pedido",
      },
    ],
    saldo: 370,
    estado: "Producción",
    fechaIngreso: "2026-09-18",
    fechaEntregaEstimada: "2026-09-22",
    notasInternas: "Material ya cortado, falta impresión en plotter Mimaki.",
    notasCliente: "Listo para recoger el martes por la tarde.",
  },
  {
    id: "lon-102",
    folio: 102,
    cliente: {
      nombre: "Clínica Veterinaria San Francisco",
      telefono: "5219991234567",
      empresa: "Vet San Francisco",
    },
    items: [
      {
        id: "item-2",
        descripcion: "Vinil autoadherible brillante alta resolución",
        ancho: 2.0,
        alto: 1.0,
        cantidad: 2,
        m2: 4.0,
        costoPorM2: 95,
        precioVentaPorM2: 220,
        costoCalculado: 380,
        precioCalculado: 880,
        precioFinal: 850,
        costoFinal: 380,
        observaciones: "Impresión para ventana principal",
      },
    ],
    subtotal: 850,
    descuento: 30,
    total: 850,
    anticipo: 850,
    pagos: [
      {
        id: "pay-2",
        fecha: "2026-09-19",
        monto: 850,
        metodo: "Transferencia",
        referencia: "TRANS-8819",
      },
    ],
    saldo: 0,
    estado: "Listo",
    fechaIngreso: "2026-09-19",
    fechaEntregaEstimada: "2026-09-21",
    notasInternas: "Empacado con tubo de cartón para evitar arrugas.",
    notasCliente: "Pagado al 100%.",
  },
  {
    id: "lon-103",
    folio: 103,
    cliente: {
      nombre: "Evento Cultural Universidad FGDLL",
      telefono: "5215512345678",
      empresa: "Universidad FGDLL",
    },
    items: [
      {
        id: "item-3",
        descripcion: "Lona Backlight con estructura metálica",
        ancho: 4.0,
        alto: 2.5,
        cantidad: 1,
        m2: 10.0,
        costoPorM2: 110,
        precioVentaPorM2: 280,
        costoCalculado: 1100,
        precioCalculado: 2800,
        precioFinal: 2800,
        costoFinal: 1100,
      },
    ],
    subtotal: 2800,
    descuento: 0,
    total: 2800,
    anticipo: 1000,
    pagos: [
      {
        id: "pay-3",
        fecha: "2026-09-20",
        monto: 1000,
        metodo: "Transferencia",
        nota: "Anticipo de compra institucional",
      },
    ],
    saldo: 1800,
    estado: "Diseño",
    fechaIngreso: "2026-09-20",
    fechaEntregaEstimada: "2026-09-25",
    notasInternas: "Esperando confirmación del logo de rectoría.",
  },
];

interface LonasOSProps {
  userEmail: string;
  onSyncWithTaskOS?: (order: LonasOrder) => void;
  onSyncWithFinanzas?: (order: LonasOrder) => void;
}

export default function LonasOS({ userEmail, onSyncWithTaskOS, onSyncWithFinanzas }: LonasOSProps) {
  const [orders, setOrders] = useState<LonasOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LONAS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_LONAS_ORDERS;
  });

  const [activeTab, setActiveTab] = useState<
    "activos" | "produccion" | "cobrar" | "entregas" | "terminados" | "finanzas"
  >("activos");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderForTicket, setSelectedOrderForTicket] = useState<LonasOrder | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [orderForPayment, setOrderForPayment] = useState<LonasOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Transferencia" | "Depósito" | "Tarjeta">(
    "Transferencia"
  );
  const [paymentRef, setPaymentRef] = useState("");

  // New Order Form state
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmpresa, setClientEmpresa] = useState("");
  const [itemDesc, setItemDesc] = useState("Lona Front 13oz con bastilla y ojillos");
  const [itemAncho, setItemAncho] = useState(2.0);
  const [itemAlto, setItemAlto] = useState(1.0);
  const [itemCantidad, setItemCantidad] = useState(1);
  const [costoPorM2, setCostoPorM2] = useState(75);
  const [precioVentaPorM2, setPrecioVentaPorM2] = useState(160);
  const [anticipoInicial, setAnticipoInicial] = useState(0);
  const [fechaEntrega, setFechaEntrega] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [orderNotes, setOrderNotes] = useState("");

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LONAS, JSON.stringify(orders));
    } catch (_) {}
  }, [orders]);

  // Calculations for new order
  const calculatedM2 = Number((itemAncho * itemAlto * itemCantidad).toFixed(2));
  const calculatedCosto = Number((calculatedM2 * costoPorM2).toFixed(2));
  const calculatedPrecio = Number((calculatedM2 * precioVentaPorM2).toFixed(2));

  // Filtered orders
  const activeOrders = orders.filter((o) => o.estado !== "Entregado");
  const completedOrders = orders.filter((o) => o.estado === "Entregado");
  const cobrarOrders = activeOrders.filter((o) => o.saldo > 0);

  // Financial indicators (only active orders count towards active operational metrics per rule #9)
  const totalVentasActivas = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const totalCostosActivos = activeOrders.reduce(
    (sum, o) => sum + o.items.reduce((iSum, it) => iSum + it.costoFinal, 0),
    0
  );
  const totalUtilidadActiva = totalVentasActivas - totalCostosActivos;
  const totalPorCobrar = cobrarOrders.reduce((sum, o) => sum + o.saldo, 0);
  const totalCobradoActivo = activeOrders.reduce((sum, o) => sum + (o.total - o.saldo), 0);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) return;

    const nextFolio = orders.length > 0 ? Math.max(...orders.map((o) => o.folio)) + 1 : 101;
    const orderTotal = calculatedPrecio;
    const initialPayment = Math.min(anticipoInicial, orderTotal);
    const initialSaldo = Math.max(0, orderTotal - initialPayment);

    const newOrder: LonasOrder = {
      id: `lon-${Date.now()}`,
      folio: nextFolio,
      cliente: {
        nombre: clientName.trim(),
        telefono: clientPhone.trim(),
        empresa: clientEmpresa.trim() || undefined,
      },
      items: [
        {
          id: `item-${Date.now()}`,
          descripcion: itemDesc.trim(),
          ancho: Number(itemAncho),
          alto: Number(itemAlto),
          cantidad: Number(itemCantidad),
          m2: calculatedM2,
          costoPorM2: Number(costoPorM2),
          precioVentaPorM2: Number(precioVentaPorM2),
          costoCalculado: calculatedCosto,
          precioCalculado: calculatedPrecio,
          precioFinal: calculatedPrecio,
          costoFinal: calculatedCosto,
        },
      ],
      subtotal: orderTotal,
      descuento: 0,
      total: orderTotal,
      anticipo: initialPayment,
      pagos:
        initialPayment > 0
          ? [
              {
                id: `pay-${Date.now()}`,
                fecha: new Date().toISOString().slice(0, 10),
                monto: initialPayment,
                metodo: "Efectivo",
                nota: "Anticipo de cotización",
              },
            ]
          : [],
      saldo: initialSaldo,
      estado: initialPayment > 0 ? "Aprobado" : "Cotización",
      fechaIngreso: new Date().toISOString().slice(0, 10),
      fechaEntregaEstimada: fechaEntrega,
      notasInternas: orderNotes.trim() || undefined,
    };

    setOrders([newOrder, ...orders]);
    setIsNewOrderModalOpen(false);
    playChime("success");

    // Reset form
    setClientName("");
    setClientPhone("");
    setClientEmpresa("");
    setAnticipoInicial(0);
    setOrderNotes("");
  };

  const handleUpdateStatus = (orderId: string, newStatus: LonasStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const isDelivered = newStatus === "Entregado";
        return {
          ...o,
          estado: newStatus,
          entregadoAt: isDelivered ? new Date().toISOString() : o.entregadoAt,
        };
      })
    );
    playChime("tick");
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForPayment || paymentAmount <= 0) return;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderForPayment.id) return o;
        const newPayment = {
          id: `pay-${Date.now()}`,
          fecha: new Date().toISOString().slice(0, 10),
          monto: Number(paymentAmount),
          metodo: paymentMethod,
          referencia: paymentRef.trim() || undefined,
        };
        const newPayments = [...o.pagos, newPayment];
        const sumPagos = newPayments.reduce((s, p) => s + p.monto, 0);
        const newSaldo = Math.max(0, o.total - sumPagos);
        return {
          ...o,
          pagos: newPayments,
          saldo: newSaldo,
        };
      })
    );

    setIsPaymentModalOpen(false);
    setOrderForPayment(null);
    setPaymentAmount(0);
    setPaymentRef("");
    playChime("success");
  };

  const handleSendWhatsAppOrder = (order: LonasOrder, type: "listo" | "cobro" | "cotizacion") => {
    let msg = "";
    if (type === "listo") {
      msg = `Hola ${order.cliente.nombre}, tu pedido de lonas (Folio #${order.folio}) ya está LISTO para entrega. Total: $${order.total} MXN, Saldo pendiente: $${order.saldo} MXN. ¡Muchas gracias!`;
    } else if (type === "cobro") {
      msg = `Hola ${order.cliente.nombre}, te saludamos de Lonas. Te compartimos el saldo pendiente de tu pedido Folio #${order.folio}: $${order.saldo} MXN. Avísanos si requieres datos de transferencia.`;
    } else {
      msg = `Hola ${order.cliente.nombre}, te enviamos la cotización de tu pedido #${order.folio} por un total de $${order.total} MXN. Avísanos para pasarlo a producción.`;
    }

    openWhatsAppInNewTab(order.cliente.telefono, msg);
  };

  const getStatusBadge = (status: LonasStatus) => {
    switch (status) {
      case "Cotización":
        return "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300";
      case "Diseño":
        return "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300";
      case "Esperando aprobación":
        return "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300";
      case "Aprobado":
        return "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300";
      case "Producción":
        return "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300";
      case "Listo":
        return "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300";
      case "Entregado":
        return "bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-stone-900 text-stone-100 border border-stone-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Printer size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">LONAS — Sistema Operativo</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950">
                Gran Formato
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Cotizaciones m², órdenes de producción, entregas, por cobrar y tickets por WhatsApp
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsNewOrderModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all min-h-[44px]"
          >
            <Plus size={16} />
            <span>Nuevo Pedido / Cotización</span>
          </button>
        </div>
      </div>

      {/* Operational Indicators (Dashboard Hoy de Lonas) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Pedidos Activos</span>
            <Package size={15} className="text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {activeOrders.length}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">En taller o diseño</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Total por Cobrar</span>
            <DollarSign size={15} className="text-rose-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            ${totalPorCobrar.toLocaleString("es-MX")}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">{cobrarOrders.length} clientes con saldo</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Cobrado Activo</span>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ${totalCobradoActivo.toLocaleString("es-MX")}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">Anticipos recibidos</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Utilidad Estimada</span>
            <TrendingUp size={15} className="text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            ${totalUtilidadActiva.toLocaleString("es-MX")}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">Margen operativo</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("activos")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "activos"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
          }`}
        >
          <Package size={14} />
          <span>Pedidos Activos ({activeOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("produccion")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "produccion"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
          }`}
        >
          <Printer size={14} />
          <span>Tablero Producción</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cobrar")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "cobrar"
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
          }`}
        >
          <DollarSign size={14} />
          <span>Por Cobrar ({cobrarOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("terminados")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "terminados"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
          }`}
        >
          <CheckCircle2 size={14} />
          <span>Terminados ({completedOrders.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar pedido por folio, cliente, teléfono o producto..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
      </div>

      {/* Orders List / Kanban Cards */}
      <div className="space-y-3">
        {(activeTab === "activos"
          ? activeOrders
          : activeTab === "cobrar"
          ? cobrarOrders
          : activeTab === "terminados"
          ? completedOrders
          : activeOrders
        )
          .filter(
            (o) =>
              o.cliente.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
              o.cliente.telefono.includes(searchQuery) ||
              String(o.folio).includes(searchQuery) ||
              o.items.some((it) => it.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .map((order) => {
            const firstItem = order.items[0];
            const waUrl = buildWhatsAppUrl(order.cliente.telefono, `Hola ${order.cliente.nombre}, `);

            return (
              <div
                key={order.id}
                className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3 transition-all hover:border-amber-400/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-black text-xs">
                      #{order.folio}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">
                        {order.cliente.nombre}
                      </h4>
                      <p className="text-[11px] text-stone-500 flex items-center gap-1.5 font-mono">
                        <Phone size={11} className="text-emerald-600" />
                        {order.cliente.telefono}
                        {order.cliente.empresa && <span>• {order.cliente.empresa}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={order.estado}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value as LonasStatus)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors focus:outline-none ${getStatusBadge(
                        order.estado
                      )}`}
                    >
                      <option value="Cotización">Cotización</option>
                      <option value="Diseño">Diseño</option>
                      <option value="Esperando aprobación">Esperando aprobación</option>
                      <option value="Aprobado">Aprobado</option>
                      <option value="Producción">Producción</option>
                      <option value="Listo">Listo</option>
                      <option value="Entregado">Entregado (Terminado)</option>
                    </select>
                  </div>
                </div>

                {/* Product details */}
                {firstItem && (
                  <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {firstItem.descripcion}
                      </span>
                      <span className="font-mono text-stone-600 dark:text-stone-300 font-bold">
                        {firstItem.ancho}m × {firstItem.alto}m ({firstItem.m2} m²)
                      </span>
                    </div>
                    {firstItem.observaciones && (
                      <p className="text-[11px] text-stone-500 italic">{firstItem.observaciones}</p>
                    )}
                  </div>
                )}

                {/* Financial bar & actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Total</span>
                      <span className="font-black text-stone-900 dark:text-stone-100">
                        ${order.total.toLocaleString("es-MX")}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Anticipo / Pagado</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ${(order.total - order.saldo).toLocaleString("es-MX")}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Saldo Pendiente</span>
                      <span
                        className={`font-black ${
                          order.saldo > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                        }`}
                      >
                        ${order.saldo.toLocaleString("es-MX")}
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {order.saldo > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderForPayment(order);
                          setPaymentAmount(order.saldo);
                          setIsPaymentModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors min-h-[38px]"
                      >
                        <DollarSign size={13} />
                        <span>Abonar</span>
                      </button>
                    )}

                    {/* WhatsApp Action with direct new tab */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors min-h-[38px]"
                      title="Abrir WhatsApp en pestaña nueva"
                    >
                      <ExternalLink size={13} />
                      <span>WhatsApp</span>
                    </a>

                    {/* Ticket view modal trigger */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForTicket(order)}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-xs flex items-center gap-1 transition-colors min-h-[38px]"
                      title="Ver e imprimir ticket comercial"
                    >
                      <FileText size={13} />
                      <span>Ticket</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* New Order / Cotizador Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-amber-500" />
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                  Nuevo Pedido / Cotizador Gran Formato
                </h3>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {/* Cliente */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase">
                  Datos del Cliente
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nombre del Cliente (ej. Don Pepe)"
                    className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Teléfono WhatsApp (ej. 19999011852)"
                    className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={clientEmpresa}
                    onChange={(e) => setClientEmpresa(e.target.value)}
                    placeholder="Empresa / Negocio (Opcional)"
                    className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Medidas y Producto */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase">
                  Cálculo de Metros Cuadrados y Precio
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500">Ancho (m)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      required
                      value={itemAncho}
                      onChange={(e) => setItemAncho(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500">Alto (m)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      required
                      value={itemAlto}
                      onChange={(e) => setItemAlto(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={itemCantidad}
                      onChange={(e) => setItemCantidad(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Precios m² */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500">Precio Venta por m² (MXN)</label>
                    <input
                      type="number"
                      value={precioVentaPorM2}
                      onChange={(e) => setPrecioVentaPorM2(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono font-bold text-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500">Costo interno por m² (MXN)</label>
                    <input
                      type="number"
                      value={costoPorM2}
                      onChange={(e) => setCostoPorM2(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono text-stone-500"
                    />
                  </div>
                </div>

                {/* Dynamic Calculated Results */}
                <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Total Metros²</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{calculatedM2} m²</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Costo Interno</span>
                    <span className="font-mono text-stone-500">${calculatedCosto}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Precio Total</span>
                    <span className="font-black text-base text-emerald-600 dark:text-emerald-400">
                      ${calculatedPrecio} MXN
                    </span>
                  </div>
                </div>
              </div>

              {/* Anticipo & Entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-500">Anticipo Inicial (MXN)</label>
                  <input
                    type="number"
                    value={anticipoInicial}
                    onChange={(e) => setAnticipoInicial(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-500">Fecha Estimada Entrega</label>
                  <input
                    type="date"
                    required
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-800 min-h-[40px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg min-h-[40px]"
                >
                  Generar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Modal (Regla: NO mostrar costo x m2 ni utilidad) */}
      {selectedOrderForTicket && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl text-stone-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg tracking-tight">LONAS & GRAN FORMATO</h3>
                <p className="text-[11px] text-stone-500">Comprobante Oficial de Pedido</p>
              </div>
              <button
                onClick={() => setSelectedOrderForTicket(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Ticket body */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-dashed pb-2">
                <span>FOLIO: #{selectedOrderForTicket.folio}</span>
                <span>FECHA: {selectedOrderForTicket.fechaIngreso}</span>
              </div>

              <div>
                <p className="font-bold text-stone-900">CLIENTE: {selectedOrderForTicket.cliente.nombre}</p>
                <p className="text-stone-500">TEL: {selectedOrderForTicket.cliente.telefono}</p>
                {selectedOrderForTicket.cliente.empresa && (
                  <p className="text-stone-500">EMPRESA: {selectedOrderForTicket.cliente.empresa}</p>
                )}
              </div>

              <div className="border-t border-b border-dashed py-2 space-y-1.5">
                <p className="font-bold">DESCRIPCIÓN:</p>
                {selectedOrderForTicket.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <div>
                      <p>{it.descripcion}</p>
                      <p className="text-[11px] text-stone-500">
                        {it.ancho}m × {it.alto}m (Cant: {it.cantidad})
                      </p>
                    </div>
                    <span className="font-bold">${it.precioFinal} MXN</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>TOTAL:</span>
                  <span className="font-black">${selectedOrderForTicket.total} MXN</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>PAGADO / ANTICIPO:</span>
                  <span>${selectedOrderForTicket.total - selectedOrderForTicket.saldo} MXN</span>
                </div>
                <div className="flex justify-between font-black text-sm text-rose-600 border-t pt-1">
                  <span>SALDO PENDIENTE:</span>
                  <span>${selectedOrderForTicket.saldo} MXN</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-100 text-[11px] text-stone-600">
                <p className="font-bold">FECHA ESTIMADA DE ENTREGA:</p>
                <p>{selectedOrderForTicket.fechaEntregaEstimada}</p>
              </div>

              <p className="text-[10px] text-center text-stone-400">
                ¡Gracias por su preferencia! Dudas o anticipos vía WhatsApp.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs"
              >
                Imprimir Ticket
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsAppOrder(selectedOrderForTicket, "listo")}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
              >
                <ExternalLink size={13} />
                <span>Enviar por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && orderForPayment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
              Registrar Pago / Abono (Folio #{orderForPayment.folio})
            </h4>
            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-stone-500">Monto del Abono (MXN)</label>
                <input
                  type="number"
                  required
                  max={orderForPayment.saldo}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold text-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-500">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                >
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Depósito">Depósito</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-500">Referencia / Nota</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Ej. TRANS-12345"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Aplicar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
