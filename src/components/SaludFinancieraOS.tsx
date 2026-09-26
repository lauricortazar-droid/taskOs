import React, { useState, useEffect } from "react";
import {
  Wallet,
  DollarSign,
  AlertTriangle,
  Calendar,
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  TrendingDown,
  TrendingUp,
  HelpCircle,
  X,
  Play,
  Check,
  Building,
  Banknote,
  PiggyBank,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import {
  FinancialAccount,
  ExpectedIncome,
  FinancialDebt,
  FinancialCommitment,
  FinancialAllocation,
  AccountType,
} from "../types";
import { playChime } from "../utils/audio";

const STORAGE_KEY_FINANZAS_ACCOUNTS = "task_os_finanzas_accounts_v1";
const STORAGE_KEY_FINANZAS_INCOMES = "task_os_finanzas_incomes_v1";
const STORAGE_KEY_FINANZAS_DEBTS = "task_os_finanzas_debts_v1";
const STORAGE_KEY_FINANZAS_COMMITMENTS = "task_os_finanzas_commitments_v1";
const STORAGE_KEY_FINANZAS_ALLOCATIONS = "task_os_finanzas_allocations_v1";

const INITIAL_ACCOUNTS: FinancialAccount[] = [
  { id: "acc-1", nombre: "BBVA Principal", tipo: "Cuenta Bancaria", saldoActual: 18450 },
  { id: "acc-2", nombre: "Efectivo Caja Taller", tipo: "Efectivo", saldoActual: 3200 },
  { id: "acc-3", nombre: "Billetera Mercado Pago", tipo: "Billetera Digital", saldoActual: 1750 },
  { id: "acc-4", nombre: "Fondo de Emergencia", tipo: "Ahorro", saldoActual: 12000 },
];

const INITIAL_INCOMES: ExpectedIncome[] = [
  {
    id: "inc-1",
    concepto: "Cobro Pedido Lonas #101 Don Pepe",
    montoEsperado: 370,
    fechaEsperada: "2026-09-22",
    montoRecibido: 0,
    estado: "Esperado",
    categoria: "Ventas Lonas",
  },
  {
    id: "inc-2",
    concepto: "Honorarios Asesoría Psicológica",
    montoEsperado: 4500,
    fechaEsperada: "2026-09-24",
    montoRecibido: 0,
    estado: "Esperado",
    categoria: "Profesional",
  },
  {
    id: "inc-3",
    concepto: "Anticipo Universidad FGDLL",
    montoEsperado: 1800,
    fechaEsperada: "2026-09-25",
    montoRecibido: 0,
    estado: "Esperado",
    categoria: "FGDLL",
  },
];

const INITIAL_DEBTS: FinancialDebt[] = [
  {
    id: "deb-1",
    acreedor: "Distribuidora de Viniles e Insumos",
    concepto: "Rollo Lona Front 13oz 3.20m",
    montoOriginal: 6400,
    saldoActual: 2200,
    vencimiento: "2026-09-26",
    pagoMinimo: 1000,
    prioridad: "Alta",
    estado: "Activa",
    historialPagos: [
      { id: "pay-d1", fecha: "2026-09-10", monto: 2200, cuentaOrigenId: "acc-1", nota: "Abono 1" },
      { id: "pay-d2", fecha: "2026-09-15", monto: 2000, cuentaOrigenId: "acc-1", nota: "Abono 2" },
    ],
  },
  {
    id: "deb-2",
    acreedor: "Tarjeta Banorte",
    concepto: "Equipo de Computo Taller",
    montoOriginal: 14500,
    saldoActual: 4800,
    vencimiento: "2026-09-29",
    pagoMinimo: 1200,
    prioridad: "Media",
    estado: "Activa",
    historialPagos: [
      { id: "pay-d3", fecha: "2026-08-30", monto: 3500, cuentaOrigenId: "acc-1" },
    ],
  },
];

const INITIAL_COMMITMENTS: FinancialCommitment[] = [
  {
    id: "com-1",
    concepto: "Renta Taller Lonas",
    monto: 6500,
    fechaVencimiento: "2026-09-30",
    categoria: "Vivienda/Local",
    esRecurrente: true,
    periodicidad: "Mensual",
  },
  {
    id: "com-2",
    concepto: "Internet y Teléfono",
    monto: 850,
    fechaVencimiento: "2026-09-25",
    categoria: "Servicios",
    esRecurrente: true,
    periodicidad: "Mensual",
  },
  {
    id: "com-3",
    concepto: "Mantenimiento Plotter Mimaki",
    monto: 1500,
    fechaVencimiento: "2026-09-27",
    categoria: "Mantenimiento",
  },
];

const INITIAL_ALLOCATIONS: FinancialAllocation[] = [
  { id: "all-1", concepto: "Apartado Renta Taller", montoApartado: 4000, estado: "Apartado" },
  { id: "all-2", concepto: "Apartado Insumos Próximos", montoApartado: 1500, estado: "Apartado" },
];

interface SaludFinancieraOSProps {
  userEmail: string;
}

export default function SaludFinancieraOS({ userEmail }: SaludFinancieraOSProps) {
  const [activeTab, setActiveTab] = useState<"hoy" | "deudas" | "cuentas" | "ingresos" | "simulador">(
    "hoy"
  );

  const [accounts, setAccounts] = useState<FinancialAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_ACCOUNTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_ACCOUNTS;
  });

  const [incomes, setIncomes] = useState<ExpectedIncome[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_INCOMES);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_INCOMES;
  });

  const [debts, setDebts] = useState<FinancialDebt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_DEBTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_DEBTS;
  });

  const [commitments, setCommitments] = useState<FinancialCommitment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_COMMITMENTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_COMMITMENTS;
  });

  const [allocations, setAllocations] = useState<FinancialAllocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_ALLOCATIONS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_ALLOCATIONS;
  });

  // Simulator state: "¿Qué puedo pagar hoy?"
  const [simulateAmount, setSimulateAmount] = useState<number>(2000);
  const [selectedDebtToSimulate, setSelectedDebtToSimulate] = useState<string>("");

  // Debt payment modal
  const [isDebtPaymentModalOpen, setIsDebtPaymentModalOpen] = useState(false);
  const [debtForPayment, setDebtForPayment] = useState<FinancialDebt | null>(null);
  const [debtAbonoMonto, setDebtAbonoMonto] = useState<number>(0);
  const [debtAbonoCuenta, setDebtAbonoCuenta] = useState<string>("acc-1");

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FINANZAS_ACCOUNTS, JSON.stringify(accounts));
      localStorage.setItem(STORAGE_KEY_FINANZAS_INCOMES, JSON.stringify(incomes));
      localStorage.setItem(STORAGE_KEY_FINANZAS_DEBTS, JSON.stringify(debts));
      localStorage.setItem(STORAGE_KEY_FINANZAS_COMMITMENTS, JSON.stringify(commitments));
      localStorage.setItem(STORAGE_KEY_FINANZAS_ALLOCATIONS, JSON.stringify(allocations));
    } catch (_) {}
  }, [accounts, incomes, debts, commitments, allocations]);

  // MATEMÁTICA CENTRAL DEL PRINCIPIO RECTOR:
  // Saldo Líquido Total = Dinero en Cuentas
  const dineroTotal = accounts.reduce((sum, a) => sum + a.saldoActual, 0);

  // Dinero Comprometido = Apartados activos + Compromisos inmediatos
  const dineroApartado = allocations
    .filter((al) => al.estado === "Apartado")
    .reduce((sum, al) => sum + al.montoApartado, 0);

  // DISPONIBLE REAL = Dinero Total - Dinero Comprometido/Apartado
  const disponibleReal = Math.max(0, dineroTotal - dineroApartado);

  // Deuda total acumulada
  const deudaTotal = debts
    .filter((d) => d.estado === "Activa")
    .reduce((sum, d) => sum + d.saldoActual, 0);

  // Ingresos esperados próximos
  const ingresosEsperadosProximos = incomes
    .filter((i) => i.estado === "Esperado" || i.estado === "Parcial")
    .reduce((sum, i) => sum + (i.montoEsperado - i.montoRecibido), 0);

  // Compromisos próximos (próximos 7 días)
  const compromisosProximosTotal = commitments
    .filter((c) => !c.pagado)
    .reduce((sum, c) => sum + c.monto, 0);

  const handleApplyDebtPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtForPayment || debtAbonoMonto <= 0) return;

    const monto = Number(debtAbonoMonto);

    // 1. Reducir saldo de la deuda
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== debtForPayment.id) return d;
        const nuevoSaldo = Math.max(0, d.saldoActual - monto);
        const nuevoHistorial = [
          ...d.historialPagos,
          {
            id: `pay-${Date.now()}`,
            fecha: new Date().toISOString().slice(0, 10),
            monto,
            cuentaOrigenId: debtAbonoCuenta,
            nota: "Abono registrado",
          },
        ];
        return {
          ...d,
          saldoActual: nuevoSaldo,
          estado: nuevoSaldo === 0 ? "Liquidada" : "Activa",
          historialPagos: nuevoHistorial,
        };
      })
    );

    // 2. Restar saldo de la cuenta bancaria de origen
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== debtAbonoCuenta) return acc;
        return {
          ...acc,
          saldoActual: Math.max(0, acc.saldoActual - monto),
        };
      })
    );

    setIsDebtPaymentModalOpen(false);
    setDebtForPayment(null);
    setDebtAbonoMonto(0);
    playChime("success");
  };

  const handleMarkIncomeReceived = (incomeId: string) => {
    setIncomes((prev) =>
      prev.map((inc) => {
        if (inc.id !== incomeId) return inc;
        return {
          ...inc,
          montoRecibido: inc.montoEsperado,
          estado: "Recibido",
        };
      })
    );

    // Sumar a cuenta principal
    setAccounts((prev) =>
      prev.map((acc, idx) => {
        if (idx === 0) {
          const inc = incomes.find((i) => i.id === incomeId);
          return { ...acc, saldoActual: acc.saldoActual + (inc?.montoEsperado || 0) };
        }
        return acc;
      })
    );
    playChime("success");
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case "Cuenta Bancaria":
        return <Building size={16} className="text-blue-500" />;
      case "Efectivo":
        return <Banknote size={16} className="text-emerald-500" />;
      case "Ahorro":
        return <PiggyBank size={16} className="text-purple-500" />;
      case "Billetera Digital":
        return <Smartphone size={16} className="text-cyan-500" />;
      default:
        return <Wallet size={16} className="text-stone-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-stone-900 text-stone-100 border border-stone-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">MI SALUD FINANCIERA</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-stone-950">
                Disponible Real
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Control de liquidez real, compromisos apartados, deudas y qué puedo pagar hoy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-400">Cuenta: {userEmail}</span>
        </div>
      </div>

      {/* DASHBOARD "HOY" — PRINCIPIO RECTOR: DISPONIBLE REAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* DISPONIBLE REAL (Métrica Reina) */}
        <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500/60 shadow-lg shadow-emerald-500/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Disponible Real
            </span>
            <ShieldCheck size={20} className="text-emerald-600" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight font-mono">
            ${disponibleReal.toLocaleString("es-MX")} <span className="text-sm font-sans">MXN</span>
          </p>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-400 leading-snug">
            Dinero que <strong>realmente puedes gastar hoy</strong> después de apartados obligatorios ($
            {dineroApartado.toLocaleString()}).
          </p>
        </div>

        {/* DINERO TOTAL EN CUENTAS */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-bold uppercase tracking-wider">Dinero Total en Cuentas</span>
            <Wallet size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 font-mono">
            ${dineroTotal.toLocaleString("es-MX")}
          </p>
          <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100 dark:border-stone-800">
            <span>Apartado/Comprometido:</span>
            <span className="font-bold text-amber-600">-${dineroApartado.toLocaleString()}</span>
          </div>
        </div>

        {/* DEUDAS ACTIVAS */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-bold uppercase tracking-wider">Deuda Total Activa</span>
            <TrendingDown size={18} className="text-rose-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
            ${deudaTotal.toLocaleString("es-MX")}
          </p>
          <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100 dark:border-stone-800">
            <span>Ingresos Esperados:</span>
            <span className="font-bold text-emerald-600">+${ingresosEsperadosProximos.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN: "LO QUE NECESITA TU ATENCIÓN" */}
      <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-3">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
          <AlertTriangle size={16} />
          <span>Lo que necesita tu atención hoy</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-900/60 text-xs flex items-center justify-between">
            <div>
              <p className="font-bold text-stone-900 dark:text-stone-100">Renta Taller Lonas</p>
              <p className="text-[11px] text-stone-500">Vence en 9 días — $6,500 MXN</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              Apartado $4,000
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-900/60 text-xs flex items-center justify-between">
            <div>
              <p className="font-bold text-stone-900 dark:text-stone-100">Distribuidora Insumos</p>
              <p className="text-[11px] text-stone-500">Vence el 26 Sept — Saldo $2,200</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
              Prioridad Alta
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-900/60 text-xs flex items-center justify-between">
            <div>
              <p className="font-bold text-stone-900 dark:text-stone-100">Cobro Lonas Don Pepe</p>
              <p className="text-[11px] text-stone-500">Por recibir mañana — $370 MXN</p>
            </div>
            <button
              onClick={() => handleMarkIncomeReceived("inc-1")}
              className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px]"
            >
              Marcar Recibido
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("hoy")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "hoy"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
          }`}
        >
          <ShieldCheck size={14} />
          <span>Hoy & Compromisos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("deudas")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "deudas"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
          }`}
        >
          <TrendingDown size={14} />
          <span>Deudas ({debts.filter((d) => d.estado === "Activa").length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cuentas")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "cuentas"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
          }`}
        >
          <Wallet size={14} />
          <span>Mis Cuentas ({accounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ingresos")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "ingresos"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
          }`}
        >
          <TrendingUp size={14} />
          <span>Ingresos Esperados ({incomes.filter((i) => i.estado === "Esperado").length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("simulador")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "simulador"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
          }`}
        >
          <Play size={14} />
          <span>¿Qué puedo pagar hoy? (Simulador)</span>
        </button>
      </div>

      {/* TAB CONTENT: DEUDAS Y PAGOS PARCIALES */}
      {activeTab === "deudas" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              Registro y Amortización de Deudas
            </h3>
            <span className="text-xs text-stone-500 font-mono">
              Total Deuda: ${deudaTotal.toLocaleString()} MXN
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {debts.map((debt) => (
              <div
                key={debt.id}
                className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {debt.acreedor}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          debt.prioridad === "Alta"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        Prioridad {debt.prioridad}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{debt.concepto}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block">Saldo Actual</span>
                      <span className="text-lg font-black text-rose-600 font-mono">
                        ${debt.saldoActual.toLocaleString()} MXN
                      </span>
                    </div>
                    {debt.estado === "Activa" && (
                      <button
                        type="button"
                        onClick={() => {
                          setDebtForPayment(debt);
                          setDebtAbonoMonto(debt.pagoMinimo || debt.saldoActual);
                          setIsDebtPaymentModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs min-h-[38px]"
                      >
                        Abonar Pago
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                    <span>Original: ${debt.montoOriginal.toLocaleString()}</span>
                    <span>
                      Pagado: ${(debt.montoOriginal - debt.saldoActual).toLocaleString()} (
                      {Math.round(((debt.montoOriginal - debt.saldoActual) / debt.montoOriginal) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          ((debt.montoOriginal - debt.saldoActual) / debt.montoOriginal) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* History summary */}
                <div className="text-[11px] text-stone-400 flex items-center justify-between">
                  <span>Vence: {debt.vencimiento}</span>
                  <span>{debt.historialPagos.length} abonos registrados</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CUENTAS */}
      {activeTab === "cuentas" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              Fuentes de Dinero & Cuentas
            </h3>
            <span className="text-xs text-stone-500 font-mono">
              Patrimonio Líquido: ${dineroTotal.toLocaleString()} MXN
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                    {getAccountIcon(acc.tipo)}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                      {acc.nombre}
                    </h4>
                    <span className="text-[11px] text-stone-500">{acc.tipo}</span>
                  </div>
                </div>
                <p className="text-base sm:text-lg font-black font-mono text-stone-900 dark:text-stone-100">
                  ${acc.saldoActual.toLocaleString("es-MX")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: INGRESOS ESPERADOS VS RECIBIDOS */}
      {activeTab === "ingresos" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              Ingresos Esperados (Detecta qué falta por llegar)
            </h3>
            <span className="text-xs font-mono text-emerald-600 font-bold">
              Por Recibir: ${ingresosEsperadosProximos.toLocaleString()} MXN
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {incomes.map((inc) => (
              <div
                key={inc.id}
                className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                      {inc.concepto}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inc.estado === "Recibido"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {inc.estado}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Fecha esperada: {inc.fechaEsperada} • Categoría: {inc.categoria}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="font-black text-sm sm:text-base font-mono text-emerald-600">
                    ${inc.montoEsperado.toLocaleString()} MXN
                  </span>
                  {inc.estado !== "Recibido" && (
                    <button
                      type="button"
                      onClick={() => handleMarkIncomeReceived(inc.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
                    >
                      Confirmar Ingreso
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SIMULADOR "¿QUÉ PUEDO PAGAR HOY?" */}
      {activeTab === "simulador" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Play size={20} className="text-emerald-600" />
            <div>
              <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                Asistente de Decisión: ¿Qué puedo pagar hoy?
              </h3>
              <p className="text-xs text-stone-500">
                Simula un pago antes de tocar tu dinero real. No modifica ningún dato hasta que confirmes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Monto que estás considerando pagar hoy (MXN):
              </label>
              <input
                type="number"
                step="100"
                min="0"
                max={disponibleReal}
                value={simulateAmount}
                onChange={(e) => setSimulateAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-base font-black text-emerald-600 font-mono"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Máximo disponible seguro: ${disponibleReal.toLocaleString()} MXN
              </span>
            </div>

            {/* Escenario Calculado */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
              <span className="font-bold text-stone-800 dark:text-stone-200 block uppercase tracking-wider text-[11px]">
                Escenario Resultante:
              </span>
              <div className="flex justify-between">
                <span className="text-stone-500">Saldo Líquido Posterior:</span>
                <span className="font-bold font-mono">
                  ${Math.max(0, dineroTotal - simulateAmount).toLocaleString()} MXN
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Dinero Apartado Protegido:</span>
                <span className="font-bold font-mono text-amber-600">
                  ${dineroApartado.toLocaleString()} MXN
                </span>
              </div>
              <div className="flex justify-between border-t pt-1 font-black">
                <span className="text-emerald-700 dark:text-emerald-400">Disponible Restante:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  ${Math.max(0, disponibleReal - simulateAmount).toLocaleString()} MXN
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debt Payment Modal */}
      {isDebtPaymentModalOpen && debtForPayment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
              Registrar Abono a {debtForPayment.acreedor}
            </h4>
            <p className="text-xs text-stone-500">Saldo actual de la deuda: ${debtForPayment.saldoActual} MXN</p>
            <form onSubmit={handleApplyDebtPayment} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-stone-500">Monto del Abono (MXN)</label>
                <input
                  type="number"
                  required
                  max={debtForPayment.saldoActual}
                  value={debtAbonoMonto}
                  onChange={(e) => setDebtAbonoMonto(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold text-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-500">Cuenta de Retiro</label>
                <select
                  value={debtAbonoCuenta}
                  onChange={(e) => setDebtAbonoCuenta(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nombre} (${acc.saldoActual.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDebtPaymentModalOpen(false)}
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
