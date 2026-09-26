import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import ExecutiveInput from "./components/ExecutiveInput";
import MessageOutputCard from "./components/MessageOutputCard";
import PomodoroArtifact from "./components/PomodoroArtifact";
import LedgerTable from "./components/LedgerTable";
import ContactsModal from "./components/ContactsModal";
import TagsModal, { DEFAULT_TAGS } from "./components/TagsModal";
import SyncModal from "./components/SyncModal";
import GoogleWorkspaceModal from "./components/GoogleWorkspaceModal";
import MobileNavBar from "./components/MobileNavBar";
import WorkMusicPlayer from "./components/WorkMusicPlayer";
import LonasOS from "./components/LonasOS";
import SaludFinancieraOS from "./components/SaludFinancieraOS";
import {
  Contact,
  TaskItem,
  TaskOSResponse,
  WhatsAppMessageItem,
  TagItem,
  SyncStatus,
  CloudSyncPayload,
} from "./types";
import { playChime } from "./utils/audio";
import { Flame, Sparkles, Users, Tag as TagIcon, Cloud, Printer, Wallet } from "lucide-react";

const STORAGE_KEY_TASKS = "task_os_pepe_cortazar_ledger_v1";
const STORAGE_KEY_CONTACTS = "task_os_pepe_contacts_v1";
const STORAGE_KEY_TAGS = "task_os_pepe_tags_v1";
const STORAGE_KEY_USER_EMAIL = "task_os_user_email_v1";
const DEFAULT_USER_EMAIL = "laurcortazar@gmail.com";

const INITIAL_CONTACTS: Contact[] = [
  {
    id: "c-1",
    nombre: "Laura",
    telefono: "+52 55 1234 5678",
    rol: "Coordinación y Proyectos",
    dominio: "Laura",
  },
  {
    id: "c-2",
    nombre: "Líder Zona Tiburón",
    telefono: "+52 55 9876 5432",
    rol: "Líder de Zona FGDLL",
    dominio: "FGDLL",
  },
  {
    id: "c-3",
    nombre: "Director Gladiadores",
    telefono: "+52 55 4567 8901",
    rol: "Director de Zona",
    dominio: "FGDLL",
  },
  {
    id: "c-4",
    nombre: "Proveedor de Lonas",
    telefono: "+52 55 2345 6789",
    rol: "Taller Impresión y Montaje",
    dominio: "Diseño",
  },
  {
    id: "c-5",
    nombre: "Coordinación Universidad FGDLL",
    telefono: "+52 55 8765 4321",
    rol: "Diplomados y Reconocimientos",
    dominio: "Universidad",
  },
];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 1,
    solicitante: "Laura",
    tarea: "Revisar y corregir los reconocimientos antes de enviarlos",
    estado: "En Proceso",
    fechaIngreso: "2026-09-21",
    fechaLimite: "2026-09-23",
    dominio: "Laura",
    etiquetas: ["Urgente", "Universidad", "Reconocimientos"],
    contacto: {
      nombre: "Laura",
      telefono: "+52 55 1234 5678",
    },
    notas: "Validar ortografía en apellidos compuestos y fecha de emisión con el archivo Excel de graduados.",
  },
  {
    id: 2,
    solicitante: "Líder Zona Tiburón",
    tarea: "Preparar y enviar la lona para la experiencia. Fecha límite: mañana",
    estado: "En Proceso",
    fechaIngreso: "2026-09-21",
    fechaLimite: "2026-09-22",
    dominio: "FGDLL",
    etiquetas: ["Importante", "Zona Tiburón", "Diseño"],
    contacto: {
      nombre: "Líder Zona Tiburón",
      telefono: "+52 55 9876 5432",
    },
    notas: "Medidas solicitadas: 3.0 x 2.0 m en lona front brillante con ojillos perimetrales reforzados cada 50 cm.",
  },
  {
    id: 3,
    solicitante: "Pepe",
    tarea: "Revisar el panel de administración de FGDLL e incluir opción de eliminar centros mañana",
    estado: "Pendiente",
    fechaIngreso: "2026-09-21",
    fechaLimite: "2026-09-25",
    dominio: "Tecnología",
    etiquetas: ["Pendiente", "Tecnología"],
  },
];

export default function App() {
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load saved ledger", e);
    }
    return INITIAL_TASKS;
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONTACTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load saved contacts", e);
    }
    return INITIAL_CONTACTS;
  });

  const [tags, setTags] = useState<TagItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load saved tags", e);
    }
    return DEFAULT_TAGS;
  });

  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<"task-os" | "lonas" | "finanzas">("task-os");

  // Cloud Sync state (Email synchronization for Phone ↔ PC)
  const [syncEmail, setSyncEmail] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const paramEmail = params.get("syncEmail");
        if (paramEmail && paramEmail.includes("@")) {
          localStorage.setItem(STORAGE_KEY_USER_EMAIL, paramEmail);
          // Clean URL without reload
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, "", cleanUrl);
          return paramEmail;
        }
        const saved = localStorage.getItem(STORAGE_KEY_USER_EMAIL);
        if (saved) return saved;
      }
    } catch (e) {
      console.error("Failed to read syncEmail from url/storage", e);
    }
    return DEFAULT_USER_EMAIL;
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    email: DEFAULT_USER_EMAIL,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  });

  const [esencialTaskId, setEsencialTaskId] = useState<number | null>(1);
  const [secundariasTaskIds, setSecundariasTaskIds] = useState<number[]>([2]);

  const [lastMessage, setLastMessage] = useState<string | null>(
    "Sí, ya lo tengo anotado. Reviso los reconocimientos antes de enviarlos y te aviso cuando queden listos."
  );
  const [lastSolicitante, setLastSolicitante] = useState<string>("Laura");
  const [multiMessages, setMultiMessages] = useState<WhatsAppMessageItem[]>([]);

  const [lastActionSummary, setLastActionSummary] = useState<string | null>(
    "Sistema Task-OS inicializado con selector de etiquetas, agenda de contactos e IA multimodal."
  );

  // Pomodoro state
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [pomodoroTaskName, setPomodoroTaskName] = useState<string>(
    "Revisar y corregir los reconocimientos antes de enviarlos"
  );
  const [pomodoroTaskId, setPomodoroTaskId] = useState<number | null>(1);
  const [pomodoroMinutes, setPomodoroMinutes] = useState<number>(25);

  const [isLoading, setIsLoading] = useState(false);

  // Save tasks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save ledger", e);
    }
  }, [tasks]);

  // Save contacts
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
    } catch (e) {
      console.error("Failed to save contacts", e);
    }
  }, [contacts]);

  // Save tags
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAGS, JSON.stringify(tags));
    } catch (e) {
      console.error("Failed to save tags", e);
    }
  }, [tags]);

  // Keep essential task valid if tasks change
  useEffect(() => {
    const activeTasks = tasks.filter((t) => t.estado !== "Completado");
    if (activeTasks.length > 0) {
      if (!esencialTaskId || !tasks.some((t) => t.id === esencialTaskId && t.estado !== "Completado")) {
        setEsencialTaskId(activeTasks[0].id);
      }
    } else {
      setEsencialTaskId(null);
    }
  }, [tasks, esencialTaskId]);

  // Helper to push state to cloud
  const pushCloudState = async (
    email: string,
    curTasks: TaskItem[],
    curContacts: Contact[],
    curTags: TagItem[],
    curEsencial: number | null,
    curSecundarias: number[]
  ) => {
    try {
      const res = await fetch("/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          tasks: curTasks,
          contacts: curContacts,
          tags: curTags,
          esencialTaskId: curEsencial,
          secundariasTaskIds: curSecundarias,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus((prev) => ({
          ...prev,
          email,
          isSyncing: false,
          lastSyncedAt: data.updatedAt || data.data?.updatedAt || new Date().toISOString(),
          error: null,
        }));
      }
    } catch (err: any) {
      console.warn("Cloud sync push error:", err);
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message,
      }));
    }
  };

  // Initial pull from cloud for syncEmail
  useEffect(() => {
    let isMounted = true;

    async function pullCloudState() {
      if (!syncEmail) return;
      setSyncStatus((prev) => ({ ...prev, email: syncEmail, isSyncing: true, error: null }));

      try {
        const res = await fetch(`/api/sync/pull?email=${encodeURIComponent(syncEmail)}`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        if (isMounted) {
          if (data.success && data.exists && data.data) {
            const cloud = data.data as CloudSyncPayload;
            if (Array.isArray(cloud.tasks) && cloud.tasks.length > 0) {
              setTasks(cloud.tasks);
            }
            if (Array.isArray(cloud.contacts) && cloud.contacts.length > 0) {
              setContacts(cloud.contacts);
            }
            if (Array.isArray(cloud.tags) && cloud.tags.length > 0) {
              setTags(cloud.tags);
            }
            if (typeof cloud.esencialTaskId === "number") {
              setEsencialTaskId(cloud.esencialTaskId);
            }
            if (Array.isArray(cloud.secundariasTaskIds)) {
              setSecundariasTaskIds(cloud.secundariasTaskIds);
            }
            setSyncStatus({
              email: syncEmail,
              isSyncing: false,
              lastSyncedAt: cloud.updatedAt || new Date().toISOString(),
              error: null,
            });
          } else {
            // First time this email connects or empty cloud: push current local state to cloud
            await pushCloudState(syncEmail, tasks, contacts, tags, esencialTaskId, secundariasTaskIds);
          }
        }
      } catch (err: any) {
        console.warn("Cloud sync pull offline or error:", err);
        if (isMounted) {
          setSyncStatus((prev) => ({
            ...prev,
            email: syncEmail,
            isSyncing: false,
            error: err.message,
          }));
        }
      }
    }

    pullCloudState();
    return () => {
      isMounted = false;
    };
  }, [syncEmail]);

  // Debounced auto-push whenever tasks, contacts, or tags change
  useEffect(() => {
    if (!syncEmail) return;

    const timer = setTimeout(() => {
      setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
      pushCloudState(syncEmail, tasks, contacts, tags, esencialTaskId, secundariasTaskIds);
    }, 1500);

    return () => clearTimeout(timer);
  }, [tasks, contacts, tags, esencialTaskId, secundariasTaskIds, syncEmail]);

  const handleChangeSyncEmail = (newEmail: string) => {
    setSyncEmail(newEmail);
    try {
      localStorage.setItem(STORAGE_KEY_USER_EMAIL, newEmail);
    } catch (_) {}
    setLastActionSummary(`Sincronización vinculada al correo ${newEmail}`);
  };

  const handleForceSync = async () => {
    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      const res = await fetch(`/api/sync/pull?email=${encodeURIComponent(syncEmail)}`);
      const data = await res.json();
      if (data.success && data.exists && data.data) {
        const cloud = data.data as CloudSyncPayload;
        if (Array.isArray(cloud.tasks)) setTasks(cloud.tasks);
        if (Array.isArray(cloud.contacts)) setContacts(cloud.contacts);
        if (Array.isArray(cloud.tags)) setTags(cloud.tags);
        if (typeof cloud.esencialTaskId === "number") setEsencialTaskId(cloud.esencialTaskId);
        if (Array.isArray(cloud.secundariasTaskIds)) setSecundariasTaskIds(cloud.secundariasTaskIds);
      }
      await pushCloudState(syncEmail, tasks, contacts, tags, esencialTaskId, secundariasTaskIds);
      setLastActionSummary(`Sincronización manual completada con ${syncEmail}`);
    } catch (err: any) {
      console.error("Force sync failed:", err);
    }
  };

  const handleProcessInput = async (
    input: string,
    imageBase64?: string,
    imageMimeType?: string,
    selectedTags?: string[],
    preassignedCategory?: string
  ) => {
    setIsLoading(true);
    setLastActionSummary(null);

    const todayStr = new Date().toISOString().split("T")[0];
    const previousMaxId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) : 0;

    try {
      const response = await fetch("/api/task-os/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          currentTasks: tasks,
          currentDate: todayStr,
          imageBase64,
          imageMimeType,
          contacts,
          selectedTags,
          preassignedCategory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data: TaskOSResponse = await response.json();

      if (data.tasks) {
        const newTasks = data.tasks.filter((t) => t.id > previousMaxId);

        // Ensure new tasks keep selectedTags if applicable
        if (selectedTags && selectedTags.length > 0) {
          if (newTasks.length > 0) {
            newTasks.forEach((target) => {
              if (!target.etiquetas || target.etiquetas.length === 0) {
                target.etiquetas = [...selectedTags];
              }
            });
          } else {
            const maxId = Math.max(...data.tasks.map((t) => t.id));
            const target = data.tasks.find((t) => t.id === maxId);
            if (target && (!target.etiquetas || target.etiquetas.length === 0)) {
              target.etiquetas = [...selectedTags];
            }
          }
        }

        // Ensure new tasks receive preassigned category if specified
        if (preassignedCategory) {
          if (newTasks.length > 0) {
            newTasks.forEach((target) => {
              target.dominio = preassignedCategory;
            });
          } else if (data.tasks.length > tasks.length) {
            const latest = data.tasks[data.tasks.length - 1];
            if (latest) latest.dominio = preassignedCategory;
          }
        }

        setTasks(data.tasks);
      }

      if (data.tareaEsencialId !== undefined) {
        setEsencialTaskId(data.tareaEsencialId);
      }

      if (data.tareasSecundariasIds !== undefined) {
        setSecundariasTaskIds(data.tareasSecundariasIds);
      }

      if (data.mensajeParaEnviar !== undefined) {
        setLastMessage(data.mensajeParaEnviar);
      }

      // Populate multiple messages queue if returned
      if (data.mensajesMultiples && data.mensajesMultiples.length > 0) {
        const mapped: WhatsAppMessageItem[] = data.mensajesMultiples.map((m, idx) => ({
          id: `msg-${Date.now()}-${idx}`,
          destinatario: m.destinatario,
          telefono: m.telefono,
          mensaje: m.mensaje,
          enviado: false,
        }));
        setMultiMessages(mapped);
      }

      if (data.resumenAccion) {
        setLastActionSummary(data.resumenAccion);
      }

      // Check if Pomodoro requested
      if (data.activarPomodoro) {
        const targetTask = data.pomodoroTarea || "Sesión de Enfoque";
        setPomodoroTaskName(targetTask);
        if (data.pomodoroMinutos) setPomodoroMinutes(data.pomodoroMinutos);

        const matched = data.tasks.find((t) =>
          targetTask.toLowerCase().includes(t.tarea.toLowerCase().slice(0, 15))
        );
        setPomodoroTaskId(matched ? matched.id : null);
        setIsPomodoroActive(true);
        playChime("tick");
      }

      playChime("success");
    } catch (err) {
      console.error("Error processing input:", err);
      setLastActionSummary("Error al conectar con el servidor. Revisa tu conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetStatus = (
    id: number,
    newStatus: "Pendiente" | "En Proceso" | "Completado"
  ) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, estado: newStatus };
          // If task completed and delegated by someone else, generate delivery notice (Ley 16)
          if (newStatus === "Completado" && t.solicitante && t.solicitante.toLowerCase() !== "pepe") {
            const reply = `Ya quedó listo lo que me pediste (${t.tarea}). Te lo comparto por aquí.`;
            setLastMessage(reply);
            setLastSolicitante(t.solicitante);

            // Also queue in multiMessages
            const contactMatch = contacts.find((c) =>
              c.nombre.toLowerCase().includes(t.solicitante.toLowerCase())
            );
            setMultiMessages((prevMsgs) => [
              {
                id: `deliv-${Date.now()}`,
                destinatario: t.solicitante,
                telefono: contactMatch?.telefono || t.contacto?.telefono,
                mensaje: reply,
                tareaId: t.id,
                enviado: false,
              },
              ...prevMsgs,
            ]);

            setLastActionSummary(`Tarea #${t.id} completada. Aviso de entrega generado para ${t.solicitante}.`);
          } else if (newStatus === "Completado") {
            setLastActionSummary(`Tarea #${t.id} completada.`);
          }
          return updated;
        }
        return t;
      })
    );
    playChime(newStatus === "Completado" ? "work_done" : "tick");
  };

  const handleToggleStatus = (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus =
      task.estado === "Pendiente"
        ? "En Proceso"
        : task.estado === "En Proceso"
        ? "Completado"
        : "Pendiente";
    handleSetStatus(id, nextStatus);
  };

  const handleStartFocus = (task: TaskItem) => {
    setPomodoroTaskName(task.tarea);
    setPomodoroTaskId(task.id);
    setPomodoroMinutes(25);
    setIsPomodoroActive(true);
    setLastActionSummary(`Sesión de enfoque activada para: ${task.tarea}`);
    playChime("tick");
  };

  const handleCompleteTaskFromPomodoro = (taskId: number | null, taskName: string) => {
    if (taskId) {
      handleSetStatus(taskId, "Completado");
    } else {
      const found = tasks.find((t) => t.tarea === taskName);
      if (found) {
        handleSetStatus(found.id, "Completado");
      }
    }
    setLastActionSummary(`¡Enfoque completado con éxito! Tarea marcada como Completada.`);
  };

  const handleUpdateTaskFechaLimite = (id: number, fechaLimite: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, fechaLimite: fechaLimite || undefined } : t))
    );
    setLastActionSummary(
      fechaLimite
        ? `Fecha límite de la tarea #${id} actualizada al ${fechaLimite}.`
        : `Fecha límite de la tarea #${id} eliminada.`
    );
  };

  const handleResetLedger = () => {
    if (window.confirm("¿Deseas restablecer el Ledger y contactos a las opciones iniciales?")) {
      setTasks(INITIAL_TASKS);
      setContacts(INITIAL_CONTACTS);
      setEsencialTaskId(1);
      setSecundariasTaskIds([2]);
      setLastMessage(
        "Sí, ya lo tengo anotado. Reviso los reconocimientos antes de enviarlos y te aviso cuando queden listos."
      );
      setLastActionSummary("Ledger y contactos restablecidos a valores iniciales.");
    }
  };

  // Contacts handlers
  const handleAddContact = (newContact: Omit<Contact, "id">) => {
    const contact: Contact = {
      ...newContact,
      id: `c-${Date.now()}`,
    };
    setContacts((prev) => [...prev, contact]);
    setLastActionSummary(`Contacto ${contact.nombre} añadido a la agenda.`);
  };

  const handleUpdateContact = (updated: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setLastActionSummary(`Contacto ${updated.nombre} actualizado.`);
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setLastActionSummary("Contacto eliminado de la agenda.");
  };

  const handleBulkAddContacts = (newContacts: Contact[]) => {
    setContacts((prev) => [...prev, ...newContacts]);
    setLastActionSummary(`${newContacts.length} contactos importados con etiquetas a la agenda.`);
  };

  const handleSelectContactForMessage = (c: Contact) => {
    const msg = lastMessage && lastMessage !== "No aplica."
      ? lastMessage
      : `Hola ${c.nombre}, te escribo respecto al seguimiento de las tareas.`;
    setLastMessage(msg);
    setLastSolicitante(c.nombre);
    setMultiMessages((prev) => [
      {
        id: `contact-msg-${Date.now()}`,
        destinatario: c.nombre,
        telefono: c.telefono,
        mensaje: msg,
        enviado: false,
      },
      ...prev,
    ]);
  };

  const handleMessageTaskContact = (task: TaskItem) => {
    const contactMatch = contacts.find((c) =>
      c.nombre.toLowerCase().includes(task.solicitante.toLowerCase())
    );
    const phone = contactMatch?.telefono || task.contacto?.telefono;
    const msg = `Hola ${task.solicitante}, sobre la tarea: "${task.tarea}"...`;

    setLastMessage(msg);
    setLastSolicitante(task.solicitante);
    setMultiMessages((prev) => [
      {
        id: `task-msg-${Date.now()}`,
        destinatario: task.solicitante,
        telefono: phone,
        mensaje: msg,
        tareaId: task.id,
        enviado: false,
      },
      ...prev,
    ]);
    setLastActionSummary(`Mensaje preparado para ${task.solicitante}.`);
  };

  const handleMarkMessageSent = (id: string) => {
    setMultiMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enviado: true } : m))
    );
  };

  // Tags handlers
  const handleAddTag = (newTag: Omit<TagItem, "id">) => {
    const created: TagItem = {
      ...newTag,
      id: `tag-${Date.now()}`,
    };
    setTags((prev) => [...prev, created]);
    setLastActionSummary(`Etiqueta "${created.nombre}" creada.`);
  };

  const handleUpdateTag = (updated: TagItem) => {
    setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setLastActionSummary(`Etiqueta "${updated.nombre}" actualizada.`);
  };

  const handleDeleteTag = (id: string) => {
    const target = tags.find((t) => t.id === id);
    setTags((prev) => prev.filter((t) => t.id !== id));
    // Also remove tag from any task that has it
    if (target) {
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          etiquetas: t.etiquetas?.filter((e) => e !== target.nombre),
        }))
      );
    }
    setLastActionSummary(`Etiqueta eliminada.`);
  };

  const handleResetTags = () => {
    setTags(DEFAULT_TAGS);
    setLastActionSummary(`Etiquetas restablecidas a valores predeterminados.`);
  };

  const handleToggleTaskTag = (taskId: number, tagName: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const current = t.etiquetas || [];
          const exists = current.includes(tagName);
          const next = exists
            ? current.filter((e) => e !== tagName)
            : [...current, tagName];
          return { ...t, etiquetas: next };
        }
        return t;
      })
    );
  };

  const handleUpdateTaskNotes = (taskId: number, notes: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, notas: notes } : t))
    );
    setLastActionSummary(`Observaciones actualizadas para la tarea #${taskId}.`);
  };

  // Google Workspace & Firebase Handlers
  const handleImportGoogleContacts = (imported: Contact[]) => {
    setContacts((prev) => {
      const existingNames = new Set(prev.map((c) => c.nombre.toLowerCase().trim()));
      const filteredNew = imported.filter(
        (c) => !existingNames.has(c.nombre.toLowerCase().trim())
      );
      const merged = [...prev, ...filteredNew];
      try {
        localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(merged));
      } catch (e) {
        console.error("Error saving contacts", e);
      }
      return merged;
    });
    setLastActionSummary(`Se importaron contactos de Google a tu agenda.`);
  };

  const handleImportGoogleTasks = (importedTasks: TaskItem[]) => {
    setTasks((prev) => {
      const merged = [...prev, ...importedTasks];
      try {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(merged));
      } catch (e) {
        console.error("Error saving tasks", e);
      }
      return merged;
    });
    setLastActionSummary(`Se agregaron ${importedTasks.length} tareas desde Google Tasks.`);
  };

  const handleTasksSyncedFromFirestore = (syncedTasks: TaskItem[]) => {
    setTasks(syncedTasks);
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(syncedTasks));
    } catch (e) {
      console.error("Error saving synced tasks", e);
    }
    setLastActionSummary(`Ledger sincronizado con Firebase Firestore.`);
  };

  const essentialTask = tasks.find((t) => t.id === esencialTaskId);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans selection:bg-amber-200 selection:text-stone-900">
      {/* Global Header */}
      <Header
        onOpenPomodoro={() => {
          if (!isPomodoroActive) {
            const taskToFocus = essentialTask?.tarea || "Sesión de Enfoque";
            setPomodoroTaskName(taskToFocus);
            setPomodoroTaskId(essentialTask?.id || null);
          }
          setIsPomodoroActive(!isPomodoroActive);
        }}
        isPomodoroActive={isPomodoroActive}
        essentialTaskName={essentialTask?.tarea}
        onOpenContacts={() => setIsContactsModalOpen(true)}
        onOpenTags={() => setIsTagsModalOpen(true)}
        onResetLedger={handleResetLedger}
        syncStatus={syncStatus}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
      />

      {/* Ecosystem Navigation Bar (Task-OS • Lonas • Salud Financiera) */}
      <div className="border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setCurrentWorkspace("task-os")}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 min-h-[42px] ${
                currentWorkspace === "task-os"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              <Flame size={15} className={currentWorkspace === "task-os" ? "text-amber-400" : ""} />
              <span>Task-OS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-700/40 text-stone-300 font-normal">
                {tasks.filter((t) => t.estado !== "Completado").length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentWorkspace("lonas")}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 min-h-[42px] ${
                currentWorkspace === "lonas"
                  ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              <Printer size={15} />
              <span>Lonas</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-600/20 text-stone-900 font-bold">
                Taller & m²
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentWorkspace("finanzas")}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 min-h-[42px] ${
                currentWorkspace === "finanzas"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              <Wallet size={15} />
              <span>Salud Financiera</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                Disponible Real
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-500">
              <Cloud size={13} className="text-emerald-500" />
              Sincronizado: {syncEmail}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6 pb-28 md:pb-12">
        {/* Render Workspace based on tab selection */}
        {currentWorkspace === "lonas" ? (
          <LonasOS userEmail={syncEmail} />
        ) : currentWorkspace === "finanzas" ? (
          <SaludFinancieraOS userEmail={syncEmail} />
        ) : (
          <>
            {/* Action feedback bar if present */}
            {lastActionSummary && (
              <div
                id="task-os-action-banner"
                className="rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-2.5 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500 shrink-0" />
                  <span>{lastActionSummary}</span>
                </div>
                <button
                  onClick={() => setLastActionSummary(null)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Top Split: Executive Input (with image reference & tags) + Output WhatsApp Message (with multi-message & contacts) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7">
                <ExecutiveInput
                  onSubmit={handleProcessInput}
                  isLoading={isLoading}
                  availableTags={tags}
                  onOpenManageTags={() => setIsTagsModalOpen(true)}
                />
              </div>

              <div className="lg:col-span-5 space-y-4">
                <MessageOutputCard
                  message={lastMessage}
                  solicitante={lastSolicitante}
                  multiMessages={multiMessages}
                  contacts={contacts}
                  onOpenContactsModal={() => setIsContactsModalOpen(true)}
                  onMarkSent={handleMarkMessageSent}
                />

                {/* Foco status widget */}
                {essentialTask && (
                  <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="p-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold mt-0.5">
                        <Flame size={14} />
                      </span>
                      <div>
                        <span className="font-semibold text-amber-950 dark:text-amber-200 uppercase tracking-wider text-[10px]">
                          Prioridad Principal (Ley 8)
                        </span>
                        <p className="font-medium text-stone-800 dark:text-stone-200 line-clamp-1">
                          #{essentialTask.id}: {essentialTask.tarea}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartFocus(essentialTask)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold transition-all shrink-0 active:scale-95"
                    >
                      Enfocar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Pomodoro Artifact Section (Ley 27) */}
            {isPomodoroActive && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      ⏱️ Sesión de Enfoque Activa (Módulo Pomodoro • Ley 27)
                    </h3>
                  </div>
                </div>
                <PomodoroArtifact
                  taskName={pomodoroTaskName}
                  taskId={pomodoroTaskId}
                  initialMinutes={pomodoroMinutes}
                  onCompleteTask={handleCompleteTaskFromPomodoro}
                  onClose={() => setIsPomodoroActive(false)}
                />
              </div>
            )}

            {/* Ledger Maestro de Tareas (Ley 1) */}
            <div className="pt-2">
              <LedgerTable
                tasks={tasks}
                esencialTaskId={esencialTaskId}
                secundariasTaskIds={secundariasTaskIds}
                availableTags={tags}
                onToggleStatus={handleToggleStatus}
                onSetStatus={handleSetStatus}
                onStartFocus={handleStartFocus}
                onSetEsencial={(id) => setEsencialTaskId(id)}
                onMessageContact={handleMessageTaskContact}
                onToggleTaskTag={handleToggleTaskTag}
                onOpenManageTags={() => setIsTagsModalOpen(true)}
                onUpdateTaskNotes={handleUpdateTaskNotes}
                onUpdateTaskFechaLimite={handleUpdateTaskFechaLimite}
                onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
              />
            </div>
          </>
        )}
      </main>

      {/* Floating Work Music Player (Google Drive, YouTube Music, Spotify) */}
      <WorkMusicPlayer />

      {/* Google Workspace & Firebase Hub Modal */}
      <GoogleWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        tasks={tasks}
        contacts={contacts}
        onImportContacts={handleImportGoogleContacts}
        onImportTasks={handleImportGoogleTasks}
        onTasksSynced={handleTasksSyncedFromFirestore}
      />

      {/* Contacts Management Modal */}
      <ContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
        contacts={contacts}
        tags={tags}
        onAddContact={handleAddContact}
        onUpdateContact={handleUpdateContact}
        onDeleteContact={handleDeleteContact}
        onSelectContactForMessage={handleSelectContactForMessage}
        onBulkAddContacts={handleBulkAddContacts}
        onOpenGoogleContacts={() => {
          setIsContactsModalOpen(false);
          setIsWorkspaceModalOpen(true);
        }}
      />

      {/* Tags Management Modal */}
      <TagsModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        tags={tags}
        onAddTag={handleAddTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
        onResetDefaultTags={handleResetTags}
      />

      {/* Cloud Synchronization Modal (Phone ↔ PC) */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncStatus={syncStatus}
        onChangeEmail={handleChangeSyncEmail}
        onForceSync={handleForceSync}
        tasks={tasks}
        esencialTaskId={esencialTaskId}
        secundariasTaskIds={secundariasTaskIds}
      />

      {/* Mobile-First Bottom Navigation Bar */}
      <MobileNavBar
        activeCount={tasks.filter((t) => t.estado !== "Completado").length}
        isPomodoroActive={isPomodoroActive}
        syncStatus={syncStatus}
        currentWorkspace={currentWorkspace}
        onChangeWorkspace={setCurrentWorkspace}
        onNewTaskClick={() => {
          if (currentWorkspace !== "task-os") setCurrentWorkspace("task-os");
          setTimeout(() => {
            const el = document.getElementById("task-os-input");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.focus();
            }
          }, 50);
        }}
        onOpenPomodoro={() => {
          if (!isPomodoroActive) {
            const taskToFocus = essentialTask?.tarea || "Sesión de Enfoque";
            setPomodoroTaskName(taskToFocus);
            setPomodoroTaskId(essentialTask?.id || null);
          }
          setIsPomodoroActive(!isPomodoroActive);
        }}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenContacts={() => setIsContactsModalOpen(true)}
        onScrollToLedger={() => {
          if (currentWorkspace !== "task-os") setCurrentWorkspace("task-os");
          setTimeout(() => {
            const el = document.getElementById("ledger-maestro-section");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 50);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-6 text-center text-xs text-stone-400 dark:text-stone-500 bg-white/50 dark:bg-stone-900/50">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Task-OS</strong> — Sistema Operativo Personal de Pepe Cortazar
          </span>
          <span className="text-[11px]">
            Menos tareas activas • Más tareas terminadas • Enfoque protegido
          </span>
        </div>
      </footer>
    </div>
  );
}
