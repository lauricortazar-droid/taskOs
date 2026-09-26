import React, { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  X,
  Volume2,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Send,
  Radio,
  Check,
} from "lucide-react";
import {
  requestFCMToken,
  sendTestNotification,
  getNotificationPermission,
  isPushSupported,
  getNotificationHistory,
  FCMNotificationRecord,
} from "../lib/fcmNotifications";
import { playChime } from "../utils/audio";

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  userEmail,
}: NotificationsModalProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isActivating, setIsActivating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [registeredDevicesCount, setRegisteredDevicesCount] = useState<number>(1);
  const [history, setHistory] = useState<FCMNotificationRecord[]>([]);

  // Preferences
  const [notifyOnTask, setNotifyOnTask] = useState<boolean>(() => {
    return localStorage.getItem("task_os_pref_notif_task") !== "false";
  });
  const [notifyOnClient, setNotifyOnClient] = useState<boolean>(() => {
    return localStorage.getItem("task_os_pref_notif_client") !== "false";
  });

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setHistory(getNotificationHistory());

      // Fetch server status of registered devices
      fetch(`/api/notifications/status?email=${encodeURIComponent(userEmail)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.registeredDevices !== undefined) {
            setRegisteredDevicesCount(Math.max(1, data.registeredDevices));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  const handleActivate = async () => {
    setIsActivating(true);
    setActionFeedback(null);
    try {
      const res = await requestFCMToken(userEmail);
      setPermission(res.permission);
      if (res.success) {
        playChime("success");
        setActionFeedback("¡Notificaciones Push activadas con éxito en este dispositivo!");
        // Refresh history
        setHistory(getNotificationHistory());
        // Send a celebratory test notification
        setTimeout(() => {
          sendTestNotification();
        }, 600);
      } else {
        setActionFeedback(res.error || "No se pudo otorgar el permiso de notificaciones.");
      }
    } catch (err: any) {
      setActionFeedback(err?.message || "Error al solicitar notificaciones.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setActionFeedback("Enviando notificación push de prueba...");
    try {
      await sendTestNotification();
      setHistory(getNotificationHistory());
      setActionFeedback("¡Notificación enviada! Revisa el banner, sonido y vibración de tu dispositivo.");
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTogglePrefTask = (val: boolean) => {
    setNotifyOnTask(val);
    localStorage.setItem("task_os_pref_notif_task", String(val));
    playChime("tick");
  };

  const handleTogglePrefClient = (val: boolean) => {
    setNotifyOnClient(val);
    localStorage.setItem("task_os_pref_notif_client", String(val));
    playChime("tick");
  };

  const supported = isPushSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#042f66] text-white flex items-center justify-center shadow-md shadow-[#042f66]/20">
              <BellRing size={20} className="text-[#f2ad00]" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Notificaciones Push (FCM)
                {permission === "granted" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Activas
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Alertas en tiempo real al celular y navegador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Feedback banner */}
          {actionFeedback && (
            <div className="p-3 rounded-2xl bg-[#eef5ff] dark:bg-[#073d83]/20 border border-[#042f66]/20 text-[#042f66] dark:text-[#a0c4f7] flex items-center gap-2 animate-in fade-in">
              <Sparkles size={16} className="text-[#f2ad00] shrink-0" />
              <span className="font-semibold text-xs">{actionFeedback}</span>
            </div>
          )}

          {/* Status card */}
          <div
            className={`p-4 rounded-2xl border ${
              permission === "granted"
                ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                  ESTADO DE DISPOSITIVO
                </span>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  {permission === "granted" ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>Notificaciones activas en tu celular / PC</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} className="text-amber-500" />
                      <span>Requiere activar permisos de Push</span>
                    </>
                  )}
                </h4>
                <p className="text-[11px] text-stone-600 dark:text-stone-400">
                  {permission === "granted"
                    ? "Recibirás avisos push automáticos con sonido y vibración cuando completes tareas o recibas mensajes de clientes."
                    : "Presiona el botón de abajo para autorizar a Task-OS a enviarte alertas instantáneas al celular."}
                </p>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-1.5">
                {permission === "granted" ? (
                  <button
                    onClick={handleTest}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-950 font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Bell size={13} className="text-[#f2ad00]" />
                    <span>{isTesting ? "Enviando..." : "Probar Push 🔔"}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleActivate}
                    disabled={isActivating || !supported}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#042f66] hover:bg-[#073d83] text-white font-bold text-xs shadow-md shadow-[#042f66]/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Smartphone size={14} className="text-[#f2ad00]" />
                    <span>{isActivating ? "Activando..." : "Activar Push 🔔"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Triggers Configuration */}
          <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-500 flex items-center justify-between">
              <span>Disparadores de Notificación Automática</span>
              <span className="text-[10px] text-emerald-600 font-bold">Tiempo Real</span>
            </h4>

            {/* Trigger 1: Tareas Completadas */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <p className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                    Al completar una tarea
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Notificación push con el título y solicitante de la tarea completada
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyOnTask}
                onChange={(e) => handleTogglePrefTask(e.target.checked)}
                className="w-4 h-4 rounded text-[#042f66] focus:ring-[#042f66]"
              />
            </div>

            {/* Trigger 2: Mensajes de Clientes */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#042f66]/10 text-[#042f66] dark:bg-[#042f66]/30 dark:text-[#a0c4f7]">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <p className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                    Al recibir o generar mensaje de cliente
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Aviso push instantáneo con el nombre del cliente y extracto del mensaje
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyOnClient}
                onChange={(e) => handleTogglePrefClient(e.target.checked)}
                className="w-4 h-4 rounded text-[#042f66] focus:ring-[#042f66]"
              />
            </div>
          </div>

          {/* Mobile instructions (Android & iOS PWA) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950 dark:text-amber-300">
              <Smartphone size={14} />
              <span>Instrucciones para Celular (Mobile First)</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-stone-700 dark:text-stone-300 text-[11px]">
              <li>
                <strong>Android (Google Chrome):</strong> Funciona directamente. Solo pulsa "Activar Push" y confirma "Permitir".
              </li>
              <li>
                <strong>iPhone (iOS Safari):</strong> Toca el botón <em>Compartir</em> de Safari y selecciona <em>"Agregar a pantalla de inicio"</em>. Abre el icono instalado y activa las notificaciones para recibirlas en la pantalla de bloqueo.
              </li>
            </ul>
          </div>

          {/* Recent Notifications Log */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-500 flex items-center justify-between">
              <span>Historial Reciente de Alertas Push</span>
              <span className="text-[10px] font-normal text-stone-400">
                {history.length} registradas
              </span>
            </h4>

            {history.length === 0 ? (
              <p className="text-[11px] text-stone-400 text-center py-4 bg-stone-50 dark:bg-stone-800/20 rounded-xl">
                Aún no hay notificaciones enviadas. Pulsa "Probar Push 🔔" para generar la primera.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {history.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/60 flex items-start gap-2 text-[11px]"
                  >
                    <span className="p-1 rounded-md bg-stone-100 dark:bg-stone-700 shrink-0 text-xs">
                      {item.type === "task_completed"
                        ? "✅"
                        : item.type === "client_message"
                        ? "💬"
                        : "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 dark:text-stone-100 truncate">
                        {item.title}
                      </p>
                      <p className="text-stone-600 dark:text-stone-400 line-clamp-1">
                        {item.body}
                      </p>
                    </div>
                    <span className="text-[9px] text-stone-400 shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <Radio size={13} className="text-emerald-500 animate-pulse" />
            <span>FCM Firebase Cloud Messaging</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
