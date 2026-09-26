import React, { useState, useEffect } from "react";
import {
  X,
  Smartphone,
  Laptop,
  QrCode,
  RefreshCw,
  Mail,
  Check,
  Copy,
  Share2,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import QRCode from "qrcode";
import { SyncStatus, TaskItem } from "../types";
import { playChime } from "../utils/audio";

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  onChangeEmail: (newEmail: string) => void;
  onForceSync: () => void;
  tasks: TaskItem[];
  esencialTaskId: number | null;
  secundariasTaskIds: number[];
}

export default function SyncModal({
  isOpen,
  onClose,
  syncStatus,
  onChangeEmail,
  onForceSync,
  tasks,
  esencialTaskId,
  secundariasTaskIds,
}: SyncModalProps) {
  const [emailInput, setEmailInput] = useState(syncStatus.email || "laurcortazar@gmail.com");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [emailDigestStatus, setEmailDigestStatus] = useState<"idle" | "loading" | "copied" | "sent">("idle");
  const [activeTab, setActiveTab] = useState<"pairing" | "email">("pairing");

  // Keep local email input in sync
  useEffect(() => {
    if (syncStatus.email) {
      setEmailInput(syncStatus.email);
    }
  }, [syncStatus.email]);

  // Construct mobile pairing link
  const pairingUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}?syncEmail=${encodeURIComponent(emailInput.trim())}`
    : "";

  // Generate QR code whenever the pairing URL changes
  useEffect(() => {
    if (!isOpen || !pairingUrl) return;

    QRCode.toDataURL(pairingUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: "#1c1917", // stone-900
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [isOpen, pairingUrl]);

  if (!isOpen) return null;

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim();
    if (clean) {
      onChangeEmail(clean);
      playChime("success");
    }
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({
          title: "Task-OS Móvil",
          text: "Abre Task-OS sincronizado en tu celular",
          url: pairingUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(pairingUrl);
      setCopiedLink(true);
      playChime("tick");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error("Failed to copy pairing link", e);
    }
  };

  const handleSendEmailDigest = async () => {
    setEmailDigestStatus("loading");
    try {
      const res = await fetch("/api/sync/email-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          tasks,
          esencialTaskId,
          secundariasTaskIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const mailtoUrl = `mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent(
          data.subject
        )}&body=${encodeURIComponent(data.bodyText)}`;

        // Open user's default email client
        window.location.href = mailtoUrl;

        // Also copy to clipboard for convenience
        try {
          await navigator.clipboard.writeText(data.bodyText);
        } catch (_) {}

        setEmailDigestStatus("sent");
        playChime("success");
        setTimeout(() => setEmailDigestStatus("idle"), 4000);
      } else {
        setEmailDigestStatus("idle");
      }
    } catch (err) {
      console.error("Error creating email summary:", err);
      setEmailDigestStatus("idle");
    }
  };

  return (
    <div
      id="sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="sync-modal-container"
        className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <RefreshCw size={20} className={syncStatus.isSyncing ? "animate-spin" : ""} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Sincronización en la Nube
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Activo
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Celular ↔ Computadora vinculados por correo
              </p>
            </div>
          </div>
          <button
            id="close-sync-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Email Account Configuration Form */}
          <form onSubmit={handleSaveEmail} className="bg-stone-50 dark:bg-stone-800/40 p-3.5 sm:p-4 rounded-2xl border border-stone-200 dark:border-stone-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="sync-email-input" className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Mail size={14} className="text-amber-500" />
                Cuenta de Correo para Sincronizar:
              </label>
              {syncStatus.lastSyncedAt && (
                <span className="text-[10px] text-stone-400">
                  Última sinc: {new Date(syncStatus.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sync-email-input"
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="tu-correo@gmail.com"
                className="flex-1 px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <button
                type="submit"
                className="px-3.5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-stone-100 dark:text-stone-900 text-xs sm:text-sm font-semibold transition-all shadow-xs shrink-0 min-h-[44px]"
              >
                Conectar
              </button>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Todas las tareas, contactos y observaciones se asocian de forma segura a este correo y se actualizan al instante en tus dispositivos.
            </p>
          </form>

          {/* Tab Selector: Código QR Celular vs Enviar Resumen al Correo */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
            <button
              type="button"
              onClick={() => setActiveTab("pairing")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "pairing"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              <Smartphone size={14} />
              <span>Ver en Celular (QR)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "email"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              <Mail size={14} />
              <span>Enviar a mi Correo</span>
            </button>
          </div>

          {activeTab === "pairing" ? (
            /* QR Code & Mobile Link */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-center space-y-3">
                <div className="inline-flex p-3 rounded-2xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 shadow-sm">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Código QR para celular"
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center text-stone-400">
                      Generando código QR...
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center justify-center gap-1.5">
                    <Smartphone size={15} className="text-amber-500" />
                    Escanea con la cámara de tu celular
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
                    Se abrirá la aplicación móvil con tu cuenta <strong>{emailInput}</strong> lista y sincronizada.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Copy Link & Force Sync */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  id="copy-mobile-sync-link-btn"
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-all min-h-[44px] shadow-xs"
                >
                  {copiedLink ? (
                    <>
                      <Check size={16} className="text-emerald-500" />
                      <span>¡Enlace copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} className="text-stone-500" />
                      <span>Copiar enlace para celular</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="force-sync-now-btn"
                  onClick={() => {
                    onForceSync();
                    playChime("tick");
                  }}
                  disabled={syncStatus.isSyncing}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold transition-all min-h-[44px] shadow-xs disabled:opacity-50"
                >
                  <RefreshCw size={16} className={syncStatus.isSyncing ? "animate-spin" : ""} />
                  <span>{syncStatus.isSyncing ? "Sincronizando..." : "Sincronizar ahora"}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Sparkles size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Tip Mobile-First:</strong> Al abrir en tu iPhone (Safari) o Android (Chrome), toca el botón <em>Compartir</em> y selecciona <strong>"Agregar a pantalla de inicio"</strong> para tener Task-OS como app nativa completa con icono y pantalla completa.
                </p>
              </div>
            </div>
          ) : (
            /* Email Summary Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                      Reporte Ejecutivo por Correo
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Envía un correo con el estado de tu Tarea Esencial y las tareas abiertas a {emailInput}.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 font-mono text-[11px] text-stone-600 dark:text-stone-300 space-y-1">
                  <div className="text-stone-400">Para: {emailInput}</div>
                  <div className="text-stone-400">Asunto: [Task-OS] Resumen Ejecutivo del Ledger</div>
                  <div className="pt-1 border-t border-stone-100 dark:border-stone-800 text-stone-700 dark:text-stone-200">
                    ⭐ Tarea Esencial: {tasks.find((t) => t.id === esencialTaskId)?.tarea || "(Sin asignar)"}
                  </div>
                  <div className="text-stone-500">
                    📋 Total tareas en ledger: {tasks.length} ({tasks.filter((t) => t.estado !== "Completado").length} abiertas)
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="send-email-digest-btn"
                onClick={handleSendEmailDigest}
                disabled={emailDigestStatus === "loading"}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-stone-100 dark:text-stone-900 text-xs sm:text-sm font-bold transition-all min-h-[44px] shadow-sm disabled:opacity-50"
              >
                {emailDigestStatus === "loading" ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Preparando reporte...</span>
                  </>
                ) : emailDigestStatus === "sent" ? (
                  <>
                    <Check size={16} className="text-emerald-500" />
                    <span>¡Abriendo correo / Copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    <span>Enviar Resumen a {emailInput}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-stone-100/70 dark:bg-stone-900/90 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Sincronización bidireccional continua</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-stone-700 dark:text-stone-200 font-semibold hover:bg-stone-200/60 dark:hover:bg-stone-800 min-h-[40px] flex items-center"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
