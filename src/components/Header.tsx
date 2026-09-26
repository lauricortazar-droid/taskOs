import React from "react";
import {
  ShieldCheck,
  Timer,
  RotateCcw,
  Users,
  Tag as TagIcon,
  Cloud,
  Smartphone,
  Laptop,
  RefreshCw,
} from "lucide-react";
import { SyncStatus } from "../types";

interface HeaderProps {
  onOpenPomodoro: () => void;
  isPomodoroActive: boolean;
  essentialTaskName?: string | null;
  onOpenContacts: () => void;
  onOpenTags?: () => void;
  onResetLedger: () => void;
  syncStatus: SyncStatus;
  onOpenSync: () => void;
  onOpenWorkspaceModal?: () => void;
}

export default function Header({
  onOpenPomodoro,
  isPomodoroActive,
  essentialTaskName,
  onOpenContacts,
  onOpenTags,
  onResetLedger,
  syncStatus,
  onOpenSync,
  onOpenWorkspaceModal,
}: HeaderProps) {
  const emailShort = syncStatus.email ? syncStatus.email.split("@")[0] : "Nube";

  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white/85 dark:bg-stone-900/85 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 flex items-center justify-center font-bold text-sm sm:text-base shadow-sm">
            T
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                TASK-OS
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <ShieldCheck size={11} /> Activo
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 truncate max-w-[130px] sm:max-w-none">
              Sistema Operativo Personal • Pepe Cortazar
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cloud Sync Button (Phone ↔ PC) */}
          <button
            id="header-cloud-sync-btn"
            onClick={onOpenSync}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px] ${
              syncStatus.isSyncing
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                : "border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700/80 text-stone-800 dark:text-stone-200"
            }`}
            title={`Sincronizado con correo: ${syncStatus.email}. Clic para ver código QR para tu celular y opciones de sincronización.`}
          >
            <div className="relative">
              <Cloud
                size={16}
                className={
                  syncStatus.isSyncing
                    ? "animate-spin text-amber-500"
                    : "text-emerald-600 dark:text-emerald-400"
                }
              />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-stone-900" />
            </div>
            <span className="hidden md:inline text-xs font-semibold">
              {syncStatus.email}
            </span>
            <span className="md:hidden text-xs font-semibold">
              {emailShort}
            </span>
          </button>

          {/* Google Workspace & Firebase Hub button */}
          {onOpenWorkspaceModal && (
            <button
              id="header-workspace-btn"
              onClick={onOpenWorkspaceModal}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-500 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px]"
              title="Google Workspace & Firebase Hub (Contacts, Calendar, Tasks, Sheets, Keep, Firestore)"
            >
              <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-blue-500 p-0.5 flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-white dark:bg-stone-900 rounded-[5px] flex items-center justify-center text-[10px] font-black text-amber-500">
                  G
                </div>
              </div>
              <span className="hidden sm:inline">Workspace & Cloud</span>
              <span className="sm:hidden text-xs font-bold">Google</span>
            </button>
          )}

          {onOpenTags && (
            <button
              id="header-tags-btn"
              onClick={onOpenTags}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px]"
              title="Gestionar Etiquetas (Prioridad, Zona, Área)"
            >
              <TagIcon size={14} />
              <span className="hidden sm:inline">Etiquetas</span>
            </button>
          )}

          <button
            id="header-contacts-btn"
            onClick={onOpenContacts}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px]"
            title="Agenda de Contactos para WhatsApp"
          >
            <Users size={14} />
            <span>Contactos</span>
          </button>

          <button
            id="header-pomodoro-btn"
            onClick={onOpenPomodoro}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-2xs min-h-[44px] ${
              isPomodoroActive
                ? "bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
                : "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200"
            }`}
            title="Activar sesión de enfoque Pomodoro (Ley 27)"
          >
            <Timer size={16} />
            <span className="hidden sm:inline">
              {isPomodoroActive ? "Pomodoro Activo" : "Modo Enfoque"}
            </span>
            <span className="sm:hidden text-xs">Foco</span>
          </button>

          <button
            id="header-reset-ledger-btn"
            onClick={onResetLedger}
            className="p-2.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Reiniciar con tareas demo iniciales"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

