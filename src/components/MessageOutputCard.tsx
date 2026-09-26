import React, { useState } from "react";
import {
  MessageSquare,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Users,
  ChevronRight,
  ChevronLeft,
  Phone,
  Send,
  Plus,
} from "lucide-react";
import { playChime } from "../utils/audio";
import { Contact, WhatsAppMessageItem } from "../types";

interface MessageOutputCardProps {
  message: string | null;
  solicitante?: string;
  multiMessages?: WhatsAppMessageItem[];
  contacts?: Contact[];
  onOpenContactsModal: () => void;
  onAddRecipientToQueue?: (contact: Contact, messageText: string) => void;
  onMarkSent?: (id: string) => void;
}

export default function MessageOutputCard({
  message,
  solicitante,
  multiMessages = [],
  contacts = [],
  onOpenContactsModal,
  onAddRecipientToQueue,
  onMarkSent,
}: MessageOutputCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedContactPhone, setSelectedContactPhone] = useState<string>("");

  // Build combined list of messages
  const messageList: WhatsAppMessageItem[] = [];

  // Add primary message if present and valid
  if (message && message.trim() !== "" && message.trim() !== "No aplica.") {
    // Attempt to find matching contact phone
    const matched = contacts.find(
      (c) =>
        solicitante &&
        (c.nombre.toLowerCase().includes(solicitante.toLowerCase()) ||
          solicitante.toLowerCase().includes(c.nombre.toLowerCase()))
    );

    messageList.push({
      id: "primary",
      destinatario: solicitante || "Destinatario",
      telefono: matched?.telefono,
      mensaje: message,
    });
  }

  // Add additional multi-messages if any
  multiMessages.forEach((m, idx) => {
    if (!messageList.some((existing) => existing.mensaje === m.mensaje && existing.destinatario === m.destinatario)) {
      messageList.push(m);
    }
  });

  if (messageList.length === 0) {
    return (
      <div
        id="mensaje-para-enviar-empty"
        className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 p-4 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-stone-400" />
          <span>
            <strong className="text-stone-700 dark:text-stone-300">
              📤 Mensajes de WhatsApp:
            </strong>{" "}
            No aplica (tarea propia o sin mensajes pendientes).
          </span>
        </div>
        <button
          onClick={onOpenContactsModal}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] font-medium"
        >
          <Users size={12} />
          Contactos
        </button>
      </div>
    );
  }

  const activeMsg = messageList[Math.min(currentIndex, messageList.length - 1)] || messageList[0];

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      playChime("success");
      setTimeout(() => setCopiedIndex(null), 2200);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const openWhatsApp = (phone?: string, text?: string) => {
    const targetText = text || activeMsg.mensaje;
    const phoneToUse = phone || activeMsg.telefono || selectedContactPhone;
    const cleanPhone = phoneToUse.replace(/[^0-9]/g, "");

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(targetText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(targetText)}`;

    window.open(url, "_blank");
    if (onMarkSent && activeMsg.id) {
      onMarkSent(activeMsg.id);
    }
    playChime("work_done");
  };

  return (
    <div
      id="mensaje-para-enviar-card"
      className="relative rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-500/30 p-4 sm:p-5 shadow-sm transition-all"
    >
      {/* Header bar with multi-message counter and contacts button */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white shadow-sm shrink-0">
            <Share2 size={16} />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200 tracking-tight">
                📤 Mensajes para WhatsApp
              </h4>
              {messageList.length > 1 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                  {currentIndex + 1} de {messageList.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300">
              <span>Para: <strong>{activeMsg.destinatario}</strong></span>
              {activeMsg.telefono && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60">
                  {activeMsg.telefono}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Header: Contacts directory shortcut */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenContactsModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white/80 dark:bg-stone-900/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-xs font-semibold transition-colors"
            title="Abrir agenda y libreta de contactos"
          >
            <Users size={13} />
            <span className="hidden sm:inline">Contactos</span>
          </button>
        </div>
      </div>

      {/* Message Text Card */}
      <div className="mt-2.5 p-3 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200/60 dark:border-emerald-900/50 text-stone-800 dark:text-stone-200 text-sm leading-relaxed font-sans select-all shadow-inner">
        "{activeMsg.mensaje}"
      </div>

      {/* Multi-message pagination if more than 1 */}
      {messageList.length > 1 && (
        <div className="mt-2 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-medium">
              Mensaje {currentIndex + 1} de {messageList.length}
            </span>
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(messageList.length - 1, prev + 1))}
              disabled={currentIndex === messageList.length - 1}
              className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            {activeMsg.enviado && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <Check size={12} /> Enviado
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Bar: 1-Click WhatsApp launch & Copy */}
      <div className="mt-3 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          {/* Quick contact select if no phone attached to current message */}
          {!activeMsg.telefono && contacts.length > 0 && (
            <select
              value={selectedContactPhone}
              onChange={(e) => setSelectedContactPhone(e.target.value)}
              className="px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 text-xs text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[150px]"
            >
              <option value="">Elegir teléfono...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.telefono}>
                  {c.nombre} ({c.telefono})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => openWhatsApp(activeMsg.telefono || selectedContactPhone, activeMsg.mensaje)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs active:scale-95"
            title="Abrir WhatsApp directamente con este mensaje"
          >
            <Send size={13} />
            <span>Mandar por WhatsApp</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="copy-whatsapp-message-btn"
            onClick={() => handleCopy(activeMsg.mensaje, currentIndex)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs active:scale-95 ${
              copiedIndex === currentIndex
                ? "bg-emerald-800 text-white"
                : "border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50"
            }`}
            title="Copiar texto para WhatsApp"
          >
            {copiedIndex === currentIndex ? (
              <>
                <Check size={13} className="stroke-[2.5]" />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy size={13} />
                Copiar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
