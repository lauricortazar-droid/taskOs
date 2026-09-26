import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Users,
  CheckSquare,
  FileSpreadsheet,
  StickyNote,
  Flame,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  LogIn,
  AlertCircle,
  Plus,
  Send,
  Download,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  auth,
  googleSignIn,
  logout,
  getAccessToken,
  initAuth,
  testFirestoreConnection,
} from "../lib/firebase";
import {
  fetchGoogleContacts,
  createGoogleContact,
  fetchCalendarEvents,
  createCalendarEvent,
  fetchGoogleTasks,
  createGoogleTask,
  exportLedgerToGoogleSheet,
  formatTaskForGoogleKeep,
  formatAllTasksForGoogleKeep,
  GoogleCalendarEvent,
  GoogleTaskItem,
} from "../lib/googleWorkspace";
import {
  batchSyncTasksToFirestore,
  loadTasksFromFirestore,
} from "../lib/firestoreService";
import { Contact, TaskItem } from "../types";
import { User } from "firebase/auth";

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  contacts: Contact[];
  onImportContacts: (newContacts: Contact[]) => void;
  onImportTasks: (newTasks: TaskItem[]) => void;
  onTasksSynced?: (syncedTasks: TaskItem[]) => void;
}

type TabType = "workspace" | "contacts" | "calendar" | "tasks" | "sheets" | "keep" | "firebase";

export default function GoogleWorkspaceModal({
  isOpen,
  onClose,
  tasks,
  contacts,
  onImportContacts,
  onImportTasks,
  onTasksSynced,
}: GoogleWorkspaceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("workspace");
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Data states
  const [googleContacts, setGoogleContacts] = useState<Contact[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [googleTasks, setGoogleTasks] = useState<GoogleTaskItem[]>([]);
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);

  // Form states for adding items
  const [selectedTaskIdForCalendar, setSelectedTaskIdForCalendar] = useState<number>(
    tasks[0]?.id || 1
  );
  const [eventDate, setEventDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [eventTime, setEventTime] = useState<string>("10:00");
  const [selectedTaskIdForTasks, setSelectedTaskIdForTasks] = useState<number>(
    tasks[0]?.id || 1
  );

  // Confirmation dialog state (MANDATORY for Workspace operations)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    actionLabel: "Confirmar",
    onConfirm: () => {},
  });

  // Init Auth listener
  useEffect(() => {
    const unsub = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        if (token) setAccessToken(token);
        testFirestoreConnection();
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Iniciando sesión con Google...");
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setStatusMessage(`Sesión iniciada como ${result.user.displayName || result.user.email}`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error al autenticar con Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setGoogleContacts([]);
      setCalendarEvents([]);
      setGoogleTasks([]);
      setStatusMessage("Sesión cerrada");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al cerrar sesión");
    }
  };

  // Contacts handler
  const loadContacts = async () => {
    if (!accessToken) {
      setErrorMessage("Por favor inicia sesión con Google primero para acceder a Google Contacts");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fetched = await fetchGoogleContacts(accessToken);
      setGoogleContacts(fetched);
      setStatusMessage(`${fetched.length} contactos cargados de Google Contacts`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudieron obtener contactos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportContacts = () => {
    if (googleContacts.length === 0) return;
    onImportContacts(googleContacts);
    setStatusMessage(`${googleContacts.length} contactos importados a la agenda de Task-OS`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Calendar handlers
  const loadCalendarEvents = async () => {
    if (!accessToken) {
      setErrorMessage("Por favor inicia sesión con Google primero para acceder a Google Calendar");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const events = await fetchCalendarEvents(accessToken);
      setCalendarEvents(events);
      setStatusMessage(`${events.length} eventos obtenidos de Google Calendar`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudieron obtener eventos de Calendar");
    } finally {
      setIsLoading(false);
    }
  };

  const requestCreateCalendarEvent = () => {
    const task = tasks.find((t) => t.id === selectedTaskIdForCalendar);
    if (!task) return;

    setConfirmDialog({
      isOpen: true,
      title: "Crear Evento en Google Calendar",
      description: `¿Deseas agendar la tarea "#${task.id}: ${task.tarea}" en tu Google Calendar para la fecha ${eventDate} a las ${eventTime} hrs?`,
      actionLabel: "Crear en Calendar",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        setErrorMessage(null);
        try {
          if (!accessToken) throw new Error("Falta token de acceso de Google");
          await createCalendarEvent(accessToken, {
            summary: `[Task-OS] ${task.tarea}`,
            description: `Solicitante: ${task.solicitante}\nEstado: ${task.estado}\nNotas: ${task.notas || "N/A"}\nID Task-OS: #${task.id}`,
            date: eventDate,
            startTime: eventTime,
            durationMinutes: 60,
          });
          setStatusMessage(`Evento agendado exitosamente en Google Calendar para "${task.tarea}"`);
          setTimeout(() => setStatusMessage(null), 4000);
          loadCalendarEvents();
        } catch (err: any) {
          setErrorMessage(err.message || "Error al agendar en Calendar");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Google Tasks handler
  const loadGoogleTasks = async () => {
    if (!accessToken) {
      setErrorMessage("Por favor inicia sesión con Google primero para acceder a Google Tasks");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fetched = await fetchGoogleTasks(accessToken);
      setGoogleTasks(fetched);
      setStatusMessage(`${fetched.length} tareas cargadas de Google Tasks`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudieron obtener tareas de Google Tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const requestCreateGoogleTask = () => {
    const task = tasks.find((t) => t.id === selectedTaskIdForTasks);
    if (!task) return;

    setConfirmDialog({
      isOpen: true,
      title: "Exportar Tarea a Google Tasks",
      description: `¿Deseas enviar la tarea "#${task.id}: ${task.tarea}" a tu lista de Google Tasks?`,
      actionLabel: "Enviar a Google Tasks",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        setErrorMessage(null);
        try {
          if (!accessToken) throw new Error("Falta token de acceso de Google");
          await createGoogleTask(accessToken, {
            title: `[#${task.id}] ${task.tarea}`,
            notes: `Solicitante: ${task.solicitante}\nDominio: ${task.dominio || "General"}\nNotas: ${task.notas || ""}`,
            dueDate: task.fechaLimite || undefined,
          });
          setStatusMessage(`Tarea enviada exitosamente a Google Tasks`);
          setTimeout(() => setStatusMessage(null), 4000);
          loadGoogleTasks();
        } catch (err: any) {
          setErrorMessage(err.message || "Error al crear tarea en Google Tasks");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleImportGoogleTasksToLedger = () => {
    if (googleTasks.length === 0) return;
    let nextId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
    const today = new Date().toISOString().split("T")[0];

    const newTasks: TaskItem[] = googleTasks.map((gt) => {
      const id = nextId++;
      return {
        id,
        tarea: gt.title,
        solicitante: "Google Tasks",
        estado: gt.status === "completed" ? "Completado" : "Pendiente",
        fechaIngreso: today,
        fechaLimite: gt.due ? gt.due.split("T")[0] : undefined,
        dominio: "Google Tasks",
        notas: gt.notes || undefined,
      };
    });

    onImportTasks(newTasks);
    setStatusMessage(`${newTasks.length} tareas importadas al Ledger Maestro`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Google Sheets handler
  const requestExportToGoogleSheets = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Exportar Ledger a Google Sheets",
      description: `Se creará una nueva hoja de cálculo en tu Google Drive con las ${tasks.length} tareas del Ledger Maestro, organizadas en columnas con formato limpio.`,
      actionLabel: "Crear Hoja de Cálculo",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        setErrorMessage(null);
        try {
          if (!accessToken) throw new Error("Falta token de acceso de Google");
          const result = await exportLedgerToGoogleSheet(accessToken, tasks);
          setCreatedSheetUrl(result.spreadsheetUrl);
          setStatusMessage("Hoja de Google Sheets creada con éxito.");
        } catch (err: any) {
          setErrorMessage(err.message || "Error al exportar a Google Sheets");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Firebase Firestore handler
  const handleSyncToFirestore = async () => {
    if (!user) {
      setErrorMessage("Debes iniciar sesión con Google para sincronizar en Firestore");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await batchSyncTasksToFirestore(user.uid, tasks);
      setStatusMessage(`${tasks.length} tareas sincronizadas con Firestore en la nube`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al sincronizar con Firestore");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullFromFirestore = async () => {
    if (!user) {
      setErrorMessage("Debes iniciar sesión con Google para cargar desde Firestore");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const loaded = await loadTasksFromFirestore(user.uid);
      if (loaded.length > 0) {
        if (onTasksSynced) onTasksSynced(loaded);
        setStatusMessage(`${loaded.length} tareas recuperadas de Firestore`);
      } else {
        setStatusMessage("No hay tareas previas en Firestore para este usuario.");
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al cargar de Firestore");
    } finally {
      setIsLoading(false);
    }
  };

  // Keep copy handler
  const handleCopyKeepFormat = () => {
    const text = formatAllTasksForGoogleKeep(tasks);
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="google-workspace-modal"
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-blue-500 p-0.5 shadow-xs flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-stone-900 rounded-[14px] flex items-center justify-center">
                <Flame size={20} className="text-amber-500" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Google Workspace & Firebase Hub
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sincronización en tiempo real y conexión con Calendar, Contacts, Tasks, Sheets y Keep
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status / Alert notifications */}
        {statusMessage && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)}>✕</button>
          </div>
        )}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)}>✕</button>
          </div>
        )}

        {/* User Account Bar */}
        <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Google"}
                    className="w-8 h-8 rounded-full border border-stone-300 dark:border-stone-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    {user.email?.charAt(0).toUpperCase() || "G"}
                  </div>
                )}
                <div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <span>{user.displayName || "Usuario Google"}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                      <ShieldCheck size={10} /> Conectado
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500">{user.email}</div>
                </div>
              </div>
            ) : (
              <div className="text-stone-600 dark:text-stone-400">
                Inicia sesión con tu cuenta de Google para activar Firestore y conectar Workspace.
              </div>
            )}
          </div>

          <div>
            {user ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5 transition-colors"
              >
                <LogOut size={13} />
                <span>Cerrar sesión</span>
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <LogIn size={15} />
                <span>{isLoading ? "Conectando..." : "Conectar Cuenta Google"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("workspace")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "workspace"
                ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "contacts"
                ? "bg-blue-600 text-white"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Users size={14} />
            <span>Google Contacts</span>
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "calendar"
                ? "bg-emerald-600 text-white"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Calendar size={14} />
            <span>Google Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "tasks"
                ? "bg-blue-500 text-white"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <CheckSquare size={14} />
            <span>Google Tasks</span>
          </button>
          <button
            onClick={() => setActiveTab("sheets")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "sheets"
                ? "bg-emerald-700 text-white"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>Google Sheets</span>
          </button>
          <button
            onClick={() => setActiveTab("keep")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "keep"
                ? "bg-amber-600 text-white"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <StickyNote size={14} />
            <span>Google Keep</span>
          </button>
          <button
            onClick={() => setActiveTab("firebase")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "firebase"
                ? "bg-amber-500 text-stone-950 font-bold"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Flame size={14} />
            <span>Firebase Cloud</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6 text-sm">
          {/* TAB: WORKSPACE OVERVIEW */}
          {activeTab === "workspace" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card Contacts */}
                <div
                  onClick={() => setActiveTab("contacts")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-blue-400 dark:hover:border-blue-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                    <Users size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Google Contacts
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Sincroniza tu libreta de contactos para autocompletar números de WhatsApp y solicitantes.
                  </p>
                </div>

                {/* Card Calendar */}
                <div
                  onClick={() => setActiveTab("calendar")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-emerald-400 dark:hover:border-emerald-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <Calendar size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Google Calendar
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Agenda fechas límite de tareas directamente como citas o recordatorios en tu calendario principal.
                  </p>
                </div>

                {/* Card Google Tasks */}
                <div
                  onClick={() => setActiveTab("tasks")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-blue-400 dark:hover:border-blue-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-500 dark:text-blue-400 flex items-center justify-center mb-3">
                    <CheckSquare size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-blue-500 dark:group-hover:text-blue-400">
                    Google Tasks
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Exporta pendientes a la app oficial de Google Tasks en tu móvil o importa tareas pendientes.
                  </p>
                </div>

                {/* Card Google Sheets */}
                <div
                  onClick={() => setActiveTab("sheets")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-emerald-400 dark:hover:border-emerald-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <FileSpreadsheet size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    Google Sheets
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Crea hojas de cálculo en tu Drive con el Ledger Maestro formateado para auditorías o respaldos.
                  </p>
                </div>

                {/* Card Google Keep */}
                <div
                  onClick={() => setActiveTab("keep")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <StickyNote size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    Google Keep
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Genera notas rápidas y listas con casillas de verificación para llevar en Google Keep.
                  </p>
                </div>

                {/* Card Firebase Firestore */}
                <div
                  onClick={() => setActiveTab("firebase")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <Flame size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    Firebase Firestore
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Base de datos persistente en la nube con reglas de seguridad estrictas y sincronización multi-dispositivo.
                  </p>
                </div>
              </div>

              {/* Status summary */}
              <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-900 dark:text-stone-100">Estado de Conectividad</span>
                  <p className="text-stone-500">
                    {user
                      ? `Conectado a Google Cloud & Firebase (Proyecto: gen-lang-client-0098696571)`
                      : "Sesión no iniciada. Haz clic en 'Conectar Cuenta Google' arriba para autenticarte."}
                  </p>
                </div>
                {user ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Activo
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-semibold">
                    Desconectado
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB: GOOGLE CONTACTS */}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                    Contactos de Google
                  </h3>
                  <p className="text-xs text-stone-500">
                    Consulta y sincroniza tus contactos personales para vincular teléfonos con tareas.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadContacts}
                    disabled={isLoading}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                    <span>Cargar de Google</span>
                  </button>
                  {googleContacts.length > 0 && (
                    <button
                      onClick={handleImportContacts}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <Download size={14} />
                      <span>Importar a Task-OS ({googleContacts.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {googleContacts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-stone-500 text-xs">
                  Haz clic en "Cargar de Google" para consultar tus contactos sincronizados.
                </div>
              ) : (
                <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-200 dark:divide-stone-800 max-h-72 overflow-y-auto">
                  {googleContacts.map((c) => (
                    <div key={c.id} className="p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/50">
                      <div>
                        <div className="font-semibold text-stone-900 dark:text-stone-100">{c.nombre}</div>
                        <div className="text-xs text-stone-500 flex items-center gap-3">
                          {c.telefono && <span>📞 {c.telefono}</span>}
                          {c.email && <span>✉️ {c.email}</span>}
                          {c.empresa && <span>🏢 {c.empresa}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {c.rol || "Google"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: GOOGLE CALENDAR */}
          {activeTab === "calendar" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                    Google Calendar
                  </h3>
                  <p className="text-xs text-stone-500">
                    Agenda tareas del Ledger Maestro directamente como eventos en tu calendario.
                  </p>
                </div>
                <button
                  onClick={loadCalendarEvents}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                  <span>Ver Eventos Próximos</span>
                </button>
              </div>

              {/* Agendar Tarea Form */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Agendar Tarea en Google Calendar
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Seleccionar Tarea:
                    </label>
                    <select
                      value={selectedTaskIdForCalendar}
                      onChange={(e) => setSelectedTaskIdForCalendar(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                    >
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.id} {t.tarea.slice(0, 45)}...
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Fecha:
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Hora de inicio:
                    </label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={requestCreateCalendarEvent}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus size={14} />
                    <span>Crear Evento en Calendar</span>
                  </button>
                </div>
              </div>

              {/* Event list */}
              {calendarEvents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-600 dark:text-stone-400">
                    Eventos en tu Calendario ({calendarEvents.length})
                  </h4>
                  <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-200 dark:divide-stone-800 max-h-52 overflow-y-auto">
                    {calendarEvents.map((evt) => (
                      <div key={evt.id} className="p-3 flex items-center justify-between text-xs hover:bg-stone-50 dark:hover:bg-stone-800/40">
                        <div>
                          <div className="font-semibold text-stone-900 dark:text-stone-100">{evt.summary}</div>
                          <div className="text-[11px] text-stone-500">
                            {evt.start.dateTime
                              ? new Date(evt.start.dateTime).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })
                              : evt.start.date}
                          </div>
                        </div>
                        {evt.htmlLink && (
                          <a
                            href={evt.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <span>Ver</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: GOOGLE TASKS */}
          {activeTab === "tasks" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                    Google Tasks
                  </h3>
                  <p className="text-xs text-stone-500">
                    Sincroniza tareas entre el Ledger Maestro y Google Tasks.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadGoogleTasks}
                    disabled={isLoading}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                    <span>Cargar Google Tasks</span>
                  </button>
                  {googleTasks.length > 0 && (
                    <button
                      onClick={handleImportGoogleTasksToLedger}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Importar a Task-OS ({googleTasks.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Export single task to Google Tasks */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Exportar Tarea de Task-OS a Google Tasks
                </h4>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select
                    value={selectedTaskIdForTasks}
                    onChange={(e) => setSelectedTaskIdForTasks(Number(e.target.value))}
                    className="w-full sm:flex-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs"
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.id} [{t.solicitante}] {t.tarea.slice(0, 50)}...
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={requestCreateGoogleTask}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Send size={14} />
                    <span>Enviar a Google Tasks</span>
                  </button>
                </div>
              </div>

              {/* Google Tasks list */}
              {googleTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-600 dark:text-stone-400">
                    Tareas en tu Google Tasks ({googleTasks.length})
                  </h4>
                  <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-200 dark:divide-stone-800 max-h-52 overflow-y-auto">
                    {googleTasks.map((gt) => (
                      <div key={gt.id} className="p-3 flex items-center justify-between text-xs hover:bg-stone-50 dark:hover:bg-stone-800/40">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                              gt.status === "completed"
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-stone-400"
                            }`}
                          >
                            {gt.status === "completed" && "✓"}
                          </span>
                          <span className={gt.status === "completed" ? "line-through text-stone-400" : "font-semibold text-stone-800 dark:text-stone-200"}>
                            {gt.title}
                          </span>
                        </div>
                        {gt.due && (
                          <span className="text-[10px] text-stone-500">
                            Vence: {gt.due.split("T")[0]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: GOOGLE SHEETS */}
          {activeTab === "sheets" && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                  Google Sheets (Hojas de Cálculo)
                </h3>
                <p className="text-xs text-stone-500">
                  Exporta todas las tareas del Ledger Maestro a una hoja en tiempo real en tu Google Drive.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Exportación Estructurada
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                      Genera un nuevo libro de cálculo en Google Sheets con columnas formateadas: ID, Solicitante, Tarea, Estado, Fecha de Ingreso, Fecha Límite, Dominio y Notas.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={requestExportToGoogleSheets}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Exportar {tasks.length} Tareas a Google Sheets</span>
                  </button>

                  {createdSheetUrl && (
                    <a
                      href={createdSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold text-xs flex items-center gap-2 shadow-sm"
                    >
                      <span>Abrir Hoja Creada</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: GOOGLE KEEP */}
          {activeTab === "keep" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                    Google Keep
                  </h3>
                  <p className="text-xs text-stone-500">
                    Convierte tus pendientes del Ledger en listas de verificación listas para Google Keep.
                  </p>
                </div>
                <a
                  href="https://keep.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <span>Abrir Google Keep</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-950 dark:text-amber-200">
                    Formato Lista de Verificación (Checklist)
                  </h4>
                  <button
                    onClick={handleCopyKeepFormat}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{isCopied ? "¡Copiado!" : "Copiar para Google Keep"}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] font-mono text-stone-700 dark:text-stone-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {formatAllTasksForGoogleKeep(tasks)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: FIREBASE FIRESTORE */}
          {activeTab === "firebase" && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                  Firebase Firestore Cloud Database
                </h3>
                <p className="text-xs text-stone-500">
                  Almacenamiento persistente en la nube con reglas de seguridad estrictas (Proyecto: gen-lang-client-0098696571).
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Sincronización de Colección de Tareas
                    </span>
                    <p className="text-xs text-stone-500">
                      Ruta Firestore: /users/{user?.uid || "{userId}"}/tasks
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                    firestore.rules Activas
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleSyncToFirestore}
                    disabled={isLoading || !user}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all disabled:opacity-50"
                  >
                    <Flame size={15} />
                    <span>Guardar Ledger en Firestore</span>
                  </button>

                  <button
                    onClick={handlePullFromFirestore}
                    disabled={isLoading || !user}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Download size={15} />
                    <span>Descargar desde Firestore</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex items-center justify-between text-xs text-stone-500">
          <span>Task-OS • Google Workspace & Firebase</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Workspace Operations (Mandatory) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
              {confirmDialog.title}
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold text-xs hover:opacity-90"
              >
                {confirmDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
