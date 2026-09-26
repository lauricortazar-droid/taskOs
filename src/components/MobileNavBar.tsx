import React from "react";
import {
  ClipboardList,
  PlusCircle,
  Timer,
  Cloud,
  Users,
  Printer,
  Wallet,
} from "lucide-react";
import { SyncStatus } from "../types";

interface MobileNavBarProps {
  activeCount: number;
  isPomodoroActive: boolean;
  syncStatus: SyncStatus;
  currentWorkspace?: "task-os" | "lonas" | "finanzas";
  onChangeWorkspace?: (ws: "task-os" | "lonas" | "finanzas") => void;
  onNewTaskClick: () => void;
  onOpenPomodoro: () => void;
  onOpenSync: () => void;
  onOpenContacts: () => void;
  onScrollToLedger: () => void;
}

export default function MobileNavBar({
  activeCount,
  isPomodoroActive,
  syncStatus,
  currentWorkspace = "task-os",
  onChangeWorkspace,
  onNewTaskClick,
  onOpenPomodoro,
  onOpenSync,
  onOpenContacts,
  onScrollToLedger,
}: MobileNavBarProps) {
  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navegación móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-2 py-1.5 shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Task-OS Tab */}
        <button
          type="button"
          onClick={() => {
            if (onChangeWorkspace) onChangeWorkspace("task-os");
            onScrollToLedger();
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-h-[46px] min-w-[50px] relative transition-colors ${
            currentWorkspace === "task-os"
              ? "text-stone-950 dark:text-white font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <ClipboardList size={19} />
          <span className="text-[10px] mt-0.5">Task-OS</span>
          {activeCount > 0 && (
            <span className="absolute top-0.5 right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 text-[9px] font-black leading-tight shadow-xs">
              {activeCount}
            </span>
          )}
        </button>

        {/* Lonas Tab */}
        <button
          type="button"
          onClick={() => onChangeWorkspace && onChangeWorkspace("lonas")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-h-[46px] min-w-[50px] transition-colors ${
            currentWorkspace === "lonas"
              ? "text-amber-600 dark:text-amber-400 font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Printer size={19} />
          <span className="text-[10px] mt-0.5">Lonas</span>
        </button>

        {/* Action Center: Nueva / Enfoque */}
        <button
          type="button"
          onClick={onNewTaskClick}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 min-h-[46px] min-w-[52px] shadow-sm transform active:scale-95 transition-transform"
        >
          <PlusCircle size={20} className="text-amber-400 dark:text-amber-600" />
          <span className="text-[10px] font-bold mt-0.5">Nueva</span>
        </button>

        {/* Finanzas Tab */}
        <button
          type="button"
          onClick={() => onChangeWorkspace && onChangeWorkspace("finanzas")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-h-[46px] min-w-[50px] transition-colors ${
            currentWorkspace === "finanzas"
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Wallet size={19} />
          <span className="text-[10px] mt-0.5">Finanzas</span>
        </button>

        {/* Agenda Contactos & WhatsApp */}
        <button
          type="button"
          onClick={onOpenContacts}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-stone-500 hover:text-stone-950 dark:hover:text-white min-h-[46px] min-w-[50px] transition-colors"
          title="Contactos & WhatsApp"
        >
          <Users size={19} />
          <span className="text-[10px] mt-0.5">Agenda</span>
        </button>
      </div>
    </nav>
  );
}
