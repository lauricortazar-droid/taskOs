import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Cloud sync persistent store directory
const DATA_DIR = path.join(process.cwd(), "data");
const SYNC_FILE = path.join(DATA_DIR, "cloud_sync.json");

interface CloudSyncRecord {
  email: string;
  tasks: TaskItem[];
  contacts?: Contact[];
  tags?: any[];
  esencialTaskId?: number | null;
  secundariasTaskIds?: number[];
  updatedAt: string;
  deviceName?: string;
}

function getSyncStore(): Record<string, CloudSyncRecord> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SYNC_FILE)) {
      fs.writeFileSync(SYNC_FILE, JSON.stringify({}), "utf8");
      return {};
    }
    const data = fs.readFileSync(SYNC_FILE, "utf8");
    return JSON.parse(data || "{}");
  } catch (err) {
    console.error("Error reading sync store:", err);
    return {};
  }
}

function saveSyncStore(store: Record<string, CloudSyncRecord>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SYNC_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving sync store:", err);
  }
}

// Initialize GoogleGenAI client lazily if key is available
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAI;
}

export interface Contact {
  id: string;
  nombre: string;
  telefono: string;
  rol?: string;
  dominio?: string;
}

export interface TaskItem {
  id: number;
  solicitante: string;
  tarea: string;
  estado: "Pendiente" | "En Proceso" | "Completado";
  fechaIngreso: string;
  dominio?: string;
  imagenReferencia?: string;
  contacto?: {
    nombre: string;
    telefono?: string;
  };
  etiquetas?: string[];
  notas?: string;
}

interface ProcessRequestBody {
  input: string;
  currentTasks: TaskItem[];
  currentDate?: string;
  imageBase64?: string;
  imageMimeType?: string;
  contacts?: Contact[];
  selectedTags?: string[];
  preassignedCategory?: string;
}

const SYSTEM_INSTRUCTION = `Eres Task-OS, el sistema operativo ejecutivo personal de Pepe Cortazar.
Tu función no es limitarte a guardar pendientes. Tu trabajo es:
- recibir mensajes, solicitudes, ideas, capturas de pantalla, imágenes e instrucciones;
- si se incluye una imagen de referencia (captura de WhatsApp, volante, documento, nota manuscrita o comprobante), analízala cuidadosamente: lee textos, solicitantes, teléfonos, fechas límite y tareas pendientes;
- detectar qué requiere acción y formular tareas concretas con verbo de acción al inicio;
- separar lo importante de lo accesorio;
- proteger el enfoque de Pepe;
- mantener un ledger confiable con columnas exactas: ID | Solicitante | Tarea | Estado | Fecha de Ingreso;
- estados permitidos ÚNICAMENTE: "Pendiente", "En Proceso", "Completado";
- IDs numéricos únicos y consecutivos; nunca reutilizar un ID;
- redactar respuestas breves listas para WhatsApp (máximo 2 líneas, humanas, naturales, sin formalismos);
- si se solicita enviar a múltiples personas o existen múltiples destinatarios (ej. avisar a Laura y al Líder de Zona, o lista de contactos), genera también "mensajesMultiples" con destinatario, teléfono si está disponible y texto redactado;
- si la tarea es de Pepe ("Tengo que...", "Debo..."), el solicitante es "Pepe" y "mensajeParaEnviar" debe ser null o "No aplica.";
- cuando una tarea delegada pase a Completado (ej. "Terminé el 1"), genera el mensaje de aviso de entrega para el solicitante (Ley 16);
- cuando Pepe pida enfocarse o un pomodoro ("ponme un pomodoro", "me voy a enfocar en X", "timer", "25 min"), activarPomodoro=true y asigna la tarea en foco;
- Ley 8: Identifica 1 tarea esencial y máximo 2 secundarias;
- Dominios frecuentes: FGDLL, Universidad FGDLL, FGDLL.org y tecnología, Diseño/impresión/producción, Proyectos profesionales (psicología), Pepe personal, Laura.`;

// API routes
// Cloud Sync endpoints for cross-device mobile & computer sync
app.get("/api/sync/pull", (req: Request, res: Response) => {
  try {
    const rawEmail = (req.query.email as string) || "";
    const cleanEmail = rawEmail.trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: "Email is required for synchronization" });
    }

    const store = getSyncStore();
    const record = store[cleanEmail];

    if (record) {
      return res.json({
        exists: true,
        data: record,
      });
    }

    return res.json({
      exists: false,
      data: null,
      message: "No cloud sync data found for this email yet.",
    });
  } catch (err: any) {
    console.error("Error pulling sync data:", err);
    return res.status(500).json({ error: err.message || "Failed to pull cloud sync data" });
  }
});

app.post("/api/sync/push", (req: Request, res: Response) => {
  try {
    const {
      email,
      tasks = [],
      contacts,
      tags,
      esencialTaskId,
      secundariasTaskIds,
      deviceName,
    } = req.body;

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: "Email is required for synchronization" });
    }

    const store = getSyncStore();
    const now = new Date().toISOString();

    const record: CloudSyncRecord = {
      email: cleanEmail,
      tasks: Array.isArray(tasks) ? tasks : [],
      contacts: Array.isArray(contacts) ? contacts : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      esencialTaskId: typeof esencialTaskId === "number" ? esencialTaskId : null,
      secundariasTaskIds: Array.isArray(secundariasTaskIds) ? secundariasTaskIds : [],
      updatedAt: now,
      deviceName: deviceName || "Navegador Web",
    };

    store[cleanEmail] = record;
    saveSyncStore(store);

    return res.json({
      success: true,
      updatedAt: now,
      totalTasks: record.tasks.length,
      email: cleanEmail,
    });
  } catch (err: any) {
    console.error("Error pushing sync data:", err);
    return res.status(500).json({ error: err.message || "Failed to push cloud sync data" });
  }
});

// Lonas synchronization endpoints
const LONAS_SYNC_FILE = path.join(DATA_DIR, "lonas_sync.json");
function getLonasStore(): Record<string, any> {
  try {
    if (!fs.existsSync(LONAS_SYNC_FILE)) return {};
    return JSON.parse(fs.readFileSync(LONAS_SYNC_FILE, "utf8") || "{}");
  } catch {
    return {};
  }
}
function saveLonasStore(store: Record<string, any>) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(LONAS_SYNC_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving lonas store:", e);
  }
}

app.get("/api/sync/lonas", (req: Request, res: Response) => {
  try {
    const email = ((req.query.email as string) || "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getLonasStore();
    return res.json({ success: true, data: store[email] || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/sync/lonas", (req: Request, res: Response) => {
  try {
    const { email, orders } = req.body;
    const cleanEmail = (email || "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getLonasStore();
    store[cleanEmail] = {
      orders: orders || [],
      updatedAt: new Date().toISOString(),
    };
    saveLonasStore(store);
    return res.json({ success: true, updatedAt: store[cleanEmail].updatedAt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Salud Financiera synchronization endpoints
const FINANZAS_SYNC_FILE = path.join(DATA_DIR, "finanzas_sync.json");
function getFinanzasStore(): Record<string, any> {
  try {
    if (!fs.existsSync(FINANZAS_SYNC_FILE)) return {};
    return JSON.parse(fs.readFileSync(FINANZAS_SYNC_FILE, "utf8") || "{}");
  } catch {
    return {};
  }
}
function saveFinanzasStore(store: Record<string, any>) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FINANZAS_SYNC_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving finanzas store:", e);
  }
}

app.get("/api/sync/finanzas", (req: Request, res: Response) => {
  try {
    const email = ((req.query.email as string) || "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getFinanzasStore();
    return res.json({ success: true, data: store[email] || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/sync/finanzas", (req: Request, res: Response) => {
  try {
    const { email, accounts, incomes, debts, commitments, allocations } = req.body;
    const cleanEmail = (email || "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getFinanzasStore();
    store[cleanEmail] = {
      accounts: accounts || [],
      incomes: incomes || [],
      debts: debts || [],
      commitments: commitments || [],
      allocations: allocations || [],
      updatedAt: new Date().toISOString(),
    };
    saveFinanzasStore(store);
    return res.json({ success: true, updatedAt: store[cleanEmail].updatedAt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Cross-Ecosystem Full Synchronization endpoint
app.post("/api/sync/ecosystem", (req: Request, res: Response) => {
  try {
    const { email, tasks, lonasOrders, finanzasData } = req.body;
    const cleanEmail = (email || "laurcortazar@gmail.com").trim().toLowerCase();

    // 1. Save tasks if provided
    if (tasks) {
      const syncStore = getSyncStore();
      syncStore[cleanEmail] = {
        email: cleanEmail,
        tasks,
        updatedAt: new Date().toISOString(),
      };
      saveSyncStore(syncStore);
    }

    // 2. Save lonas if provided
    if (lonasOrders) {
      const lonasStore = getLonasStore();
      lonasStore[cleanEmail] = {
        orders: lonasOrders,
        updatedAt: new Date().toISOString(),
      };
      saveLonasStore(lonasStore);
    }

    // 3. Save finanzas if provided
    if (finanzasData) {
      const finStore = getFinanzasStore();
      finStore[cleanEmail] = {
        ...finanzasData,
        updatedAt: new Date().toISOString(),
      };
      saveFinanzasStore(finStore);
    }

    return res.json({
      success: true,
      message: "Ecosistema sincronizado exitosamente",
      email: cleanEmail,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/sync/email-summary", (req: Request, res: Response) => {
  try {
    const { email, tasks = [], esencialTaskId, secundariasTaskIds = [] } = req.body;
    const cleanEmail = (email || "").trim();
    const dateStr = new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const activeTasks = tasks.filter((t: any) => t.estado !== "Completado");
    const completedTasks = tasks.filter((t: any) => t.estado === "Completado");
    const esencial = tasks.find((t: any) => t.id === esencialTaskId);
    const secundarias = tasks.filter((t: any) => secundariasTaskIds.includes(t.id));

    let body = `Hola,\n\nEste es tu resumen ejecutivo de Task-OS sincronizado con tu correo (${cleanEmail}) para ${dateStr}.\n\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `⭐ TAREA ESENCIAL DE HOY (Ley del Foco):\n`;
    if (esencial) {
      body += `[ID #${esencial.id}] [${esencial.dominio || "General"}] ${esencial.tarea} (Solicitante: ${esencial.solicitante})\n`;
    } else {
      body += `(No hay tarea esencial definida)\n`;
    }

    body += `\n🎯 TAREAS SECUNDARIAS:\n`;
    if (secundarias.length > 0) {
      secundarias.forEach((t: any) => {
        body += `• [ID #${t.id}] ${t.tarea} (${t.solicitante})\n`;
      });
    } else {
      body += `(Ninguna)\n`;
    }

    body += `\n📋 TAREAS ABIERTAS TOTALES (${activeTasks.length}):\n`;
    activeTasks.forEach((t: any) => {
      body += `• [#${t.id}] [${t.estado}] [${t.dominio || "General"}] ${t.tarea} — ${t.solicitante}${t.contacto?.telefono ? ` (Tel: ${t.contacto.telefono})` : ""}\n`;
      if (t.notas) {
        body += `   Observaciones: ${t.notas}\n`;
      }
    });

    if (completedTasks.length > 0) {
      body += `\n✅ COMPLETADAS RECIENTES (${completedTasks.length}):\n`;
      completedTasks.slice(0, 5).forEach((t: any) => {
        body += `✓ [#${t.id}] ${t.tarea} (${t.solicitante})\n`;
      });
    }

    body += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `Sincronizado vía Task-OS Cloud • Celular y Computadora al día.`;

    const subject = `[Task-OS] Resumen Ejecutivo del Ledger — ${dateStr}`;

    return res.json({
      success: true,
      subject,
      bodyText: body,
      email: cleanEmail,
    });
  } catch (err: any) {
    console.error("Error generating email summary:", err);
    return res.status(500).json({ error: err.message || "Failed to generate summary" });
  }
});

app.post("/api/task-os/process", async (req: Request, res: Response) => {
  try {
    const {
      input,
      currentTasks = [],
      currentDate,
      imageBase64,
      imageMimeType = "image/jpeg",
      contacts = [],
      selectedTags = [],
      preassignedCategory,
    } = req.body as ProcessRequestBody;
    const todayStr = currentDate || new Date().toISOString().split("T")[0];

    const ai = getGenAI();

    if (!ai) {
      // Offline fallback processing based on prompt laws
      const fallbackResult = processLocally(input, currentTasks, todayStr, imageBase64, contacts, selectedTags, preassignedCategory);
      return res.json(fallbackResult);
    }

    const promptText = `Fecha actual: ${todayStr}

Agenda / Directorio de contactos conocidos:
${JSON.stringify(contacts, null, 2)}

Ledger actual de tareas existentes:
${JSON.stringify(currentTasks, null, 2)}

Etiquetas seleccionadas por el usuario para esta tarea/mensaje:
${JSON.stringify(selectedTags)}

Categoría / Dominio pre-asignado por el usuario: ${preassignedCategory ? `"${preassignedCategory}"` : "(Ninguno preasignado, clasificar automáticamente)"}

Mensaje o instrucción recibido de Pepe:
"""
${input || "(Sin texto directo, analizar imagen adjunta)"}
"""

${imageBase64 ? "Se ha adjuntado una imagen de referencia. Analiza tanto la imagen como el texto." : ""}

Aplica todas las leyes de Task-OS (Leyes 1 a 27) y devuelve el estado resultante.
${preassignedCategory ? `IMPORTANTE: El usuario pre-asignó la categoría "${preassignedCategory}". Si creas una nueva tarea en el ledger, debes asignar exactamente "${preassignedCategory}" a su campo 'dominio'.` : ""}
Si se crearon tareas nuevas, incluye las etiquetas seleccionadas si aplican.`;

    // Multimodal payload
    let contentsPayload: any = promptText;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: imageMimeType,
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: contentsPayload,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mensajeParaEnviar: {
              type: Type.STRING,
              description: "Mensaje principal listo para WhatsApp o 'No aplica.'",
            },
            mensajesMultiples: {
              type: Type.ARRAY,
              description: "Lista de mensajes para mandar por WhatsApp a uno o múltiples contactos",
              items: {
                type: Type.OBJECT,
                properties: {
                  destinatario: { type: Type.STRING },
                  telefono: { type: Type.STRING },
                  mensaje: { type: Type.STRING },
                },
                required: ["destinatario", "mensaje"],
              },
            },
            tasks: {
              type: Type.ARRAY,
              description: "Lista completa y acumulada del Ledger Maestro de Tareas.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  solicitante: { type: Type.STRING },
                  tarea: { type: Type.STRING },
                  estado: {
                    type: Type.STRING,
                    enum: ["Pendiente", "En Proceso", "Completado"],
                  },
                  fechaIngreso: { type: Type.STRING },
                  dominio: { type: Type.STRING },
                  contacto: {
                    type: Type.OBJECT,
                    properties: {
                      nombre: { type: Type.STRING },
                      telefono: { type: Type.STRING },
                    },
                  },
                  etiquetas: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  notas: {
                    type: Type.STRING,
                    description: "Sub-notas u observaciones sobre la tarea sin abarrotar la descripción principal.",
                  },
                },
                required: ["id", "solicitante", "tarea", "estado", "fechaIngreso"],
              },
            },
            tareaEsencialId: { type: Type.INTEGER },
            tareasSecundariasIds: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
            },
            activarPomodoro: { type: Type.BOOLEAN },
            pomodoroTarea: { type: Type.STRING },
            pomodoroMinutos: { type: Type.INTEGER },
            resumenAccion: { type: Type.STRING },
          },
          required: ["tasks", "activarPomodoro"],
        },
      },
    });

    const jsonText = response.text?.trim() || "{}";
    const parsed = JSON.parse(jsonText);

    // Preserve existing notes, tags, or reference images for existing tasks
    if (parsed.tasks && Array.isArray(parsed.tasks)) {
      parsed.tasks.forEach((t: any) => {
        const existing = currentTasks.find((c: any) => c.id === t.id);
        if (existing) {
          if (existing.notas && !t.notas) {
            t.notas = existing.notas;
          }
          if (existing.imagenReferencia && !t.imagenReferencia) {
            t.imagenReferencia = existing.imagenReferencia;
          }
          if (existing.etiquetas && (!t.etiquetas || t.etiquetas.length === 0)) {
            t.etiquetas = existing.etiquetas;
          }
        }
      });
    }

    // If image was provided, attach to the latest created or updated task if it doesn't have one
    if (imageBase64 && parsed.tasks && parsed.tasks.length > 0) {
      const highestId = Math.max(...parsed.tasks.map((t: any) => t.id));
      const target = parsed.tasks.find((t: any) => t.id === highestId);
      if (target && !target.imagenReferencia) {
        target.imagenReferencia = imageBase64;
      }
    }

    // If selectedTags were passed, ensure latest task gets them
    if (selectedTags && selectedTags.length > 0 && parsed.tasks && parsed.tasks.length > 0) {
      const highestId = Math.max(...parsed.tasks.map((t: any) => t.id));
      const target = parsed.tasks.find((t: any) => t.id === highestId);
      if (target) {
        target.etiquetas = Array.from(new Set([...(target.etiquetas || []), ...selectedTags]));
      }
    }

    return res.json(parsed);
  } catch (error) {
    console.error("Error processing with Gemini API, running local fallback:", error);
    const {
      input,
      currentTasks = [],
      currentDate,
      imageBase64,
      contacts = [],
      selectedTags = [],
      preassignedCategory,
    } = req.body as ProcessRequestBody;
    const todayStr = currentDate || new Date().toISOString().split("T")[0];
    const fallbackResult = processLocally(input, currentTasks, todayStr, imageBase64, contacts, selectedTags, preassignedCategory);
    return res.json(fallbackResult);
  }
});

// Deterministic fallback rule-engine implementing Task-OS laws
function processLocally(
  input: string,
  currentTasks: TaskItem[],
  todayStr: string,
  imageBase64?: string,
  contacts: Contact[] = [],
  selectedTags: string[] = [],
  preassignedCategory?: string
) {
  const trimmed = (input || "").trim();
  const lower = trimmed.toLowerCase();

  let nextId = currentTasks.length > 0 ? Math.max(...currentTasks.map((t) => t.id)) + 1 : 1;
  const updatedTasks = [...currentTasks];
  let mensajeParaEnviar: string | null = "No aplica.";
  let activarPomodoro = false;
  let pomodoroTarea: string | null = null;
  let pomodoroMinutos = 25;
  let resumenAccion = "Ledger actualizado";

  // Check Pomodoro intent (Ley 27)
  if (
    lower.includes("pomodoro") ||
    lower.includes("modo foco") ||
    lower.includes("enfocar") ||
    lower.includes("enfoque") ||
    lower.includes("timer") ||
    lower.includes("25 min")
  ) {
    activarPomodoro = true;
    // Extract task name if specified
    const matchFocus = lower.match(/(?:enfo(?:car|que)\s+en|pomodoro\s+en|para)\s+([^.]+)/i);
    if (matchFocus && matchFocus[1]) {
      pomodoroTarea = matchFocus[1].trim();
    } else {
      const active = currentTasks.find((t) => t.estado === "En Proceso" || t.estado === "Pendiente");
      pomodoroTarea = active ? active.tarea : "Sesión de Enfoque";
    }
    resumenAccion = `Sesión de enfoque activada para: ${pomodoroTarea}`;
    return {
      mensajeParaEnviar: "No aplica.",
      tasks: updatedTasks,
      tareaEsencialId: updatedTasks[0]?.id || null,
      tareasSecundariasIds: updatedTasks.slice(1, 3).map((t) => t.id),
      activarPomodoro: true,
      pomodoroTarea,
      pomodoroMinutos,
      resumenAccion,
    };
  }

  // Check completion (Ley 15 & 16)
  const matchFinish = lower.match(/(?:termin[eé]|listo|ya qued[oó]|complet(?:e|ado))\s+(?:el|la|id|tarea)?\s*#?(\d+)/i);
  if (matchFinish && matchFinish[1]) {
    const targetId = parseInt(matchFinish[1], 10);
    const taskIndex = updatedTasks.findIndex((t) => t.id === targetId);
    if (taskIndex !== -1) {
      updatedTasks[taskIndex].estado = "Completado";
      const task = updatedTasks[taskIndex];
      if (task.solicitante && task.solicitante.toLowerCase() !== "pepe") {
        mensajeParaEnviar = `Ya quedó listo: ${task.tarea.replace(/^[a-zñáéíóú\s]+(?=para|de|los|la|el)/i, "").trim() || "lo que me pediste"}. Te lo comparto por aquí.`;
      } else {
        mensajeParaEnviar = "No aplica.";
      }
      resumenAccion = `Tarea #${targetId} marcada como Completada`;
      return {
        mensajeParaEnviar,
        tasks: updatedTasks,
        tareaEsencialId: updatedTasks.find((t) => t.estado !== "Completado")?.id || null,
        tareasSecundariasIds: updatedTasks.filter((t) => t.estado !== "Completado").slice(1, 3).map((t) => t.id),
        activarPomodoro: false,
        resumenAccion,
      };
    }
  }

  // Check if informational / no action (Ley 21 & 22)
  if (
    (lower.startsWith("gracias") || lower.startsWith("hola") || lower.includes("le gustó cómo")) &&
    !lower.includes("necesito") &&
    !lower.includes("falta") &&
    !lower.includes("acuérdate")
  ) {
    return {
      mensajeParaEnviar: "No aplica.",
      tasks: updatedTasks,
      tareaEsencialId: updatedTasks.find((t) => t.estado !== "Completado")?.id || null,
      tareasSecundariasIds: updatedTasks.filter((t) => t.estado !== "Completado").slice(1, 3).map((t) => t.id),
      activarPomodoro: false,
      resumenAccion: "Mensaje informativo recibido; no genera tarea.",
    };
  }

  // Extract applicant (Ley 10, 11, 12)
  let solicitante = "Pepe";
  let cleanTaskText = trimmed;
  let domain = preassignedCategory || "Personal";

  if (lower.includes("laura")) {
    solicitante = "Laura";
    if (!preassignedCategory) domain = "Laura";
  } else if (lower.includes("tiburón") || lower.includes("tiburon")) {
    solicitante = "Líder Zona Tiburón";
    if (!preassignedCategory) domain = "FGDLL";
  } else if (lower.includes("gladiadores")) {
    solicitante = "Director Gladiadores";
    if (!preassignedCategory) domain = "FGDLL";
  } else if (lower.includes("diplomado") || lower.includes("universidad")) {
    solicitante = "Universidad FGDLL";
    if (!preassignedCategory) domain = "Universidad";
  } else if (lower.includes("proveedor") || lower.includes("lona") || lower.includes("impresión")) {
    if (!preassignedCategory) domain = "Diseño";
  } else if (lower.includes("fgdll.org") || lower.includes("panel") || lower.includes("github")) {
    if (!preassignedCategory) domain = "Tecnología";
  }

  // Create action-oriented task (Ley 5)
  let actionTask = cleanTaskText
    .replace(/^mensaje\s+(?:de\s+[^:]+:?|:)/i, "")
    .replace(/^(?:oye,?\s*|pepe,?\s*|porfa,?\s*|por\s+favor,?\s*)/i, "")
    .trim();

  // If missing initial action verb, prepend appropriate verb
  if (!/^(preparar|revisar|diseñar|enviar|subir|crear|actualizar|corregir|organizar|terminar|contactar|consultar|resolver)/i.test(actionTask)) {
    if (lower.includes("lona")) {
      actionTask = "Diseñar y enviar " + actionTask;
    } else if (lower.includes("reconocimiento")) {
      actionTask = "Revisar y corregir los reconocimientos " + actionTask;
    } else if (lower.includes("panel")) {
      actionTask = "Revisar y actualizar el panel de administración " + actionTask;
    } else {
      actionTask = "Revisar y dar seguimiento a " + actionTask;
    }
  }

  // Capitalize
  actionTask = actionTask.charAt(0).toUpperCase() + actionTask.slice(1);

  // Match contact if available
  const matchedContact = contacts.find(
    (c) =>
      c.nombre.toLowerCase().includes(solicitante.toLowerCase()) ||
      solicitante.toLowerCase().includes(c.nombre.toLowerCase())
  );

  // Add task to ledger
  updatedTasks.push({
    id: nextId,
    solicitante,
    tarea: actionTask,
    estado: "En Proceso",
    fechaIngreso: todayStr,
    dominio: domain,
    imagenReferencia: imageBase64,
    contacto: matchedContact
      ? { nombre: matchedContact.nombre, telefono: matchedContact.telefono }
      : undefined,
    etiquetas: selectedTags.length > 0 ? selectedTags : undefined,
  });

  // Compose WhatsApp reply if external (Ley 13, 14)
  if (solicitante !== "Pepe") {
    if (solicitante === "Laura") {
      mensajeParaEnviar = `Sí, ya lo tengo anotado. Lo reviso y te aviso cuando quede listo.`;
    } else if (solicitante === "Líder Zona Tiburón") {
      mensajeParaEnviar = `Ya tengo anotada la solicitud. La considero con prioridad y te aviso en cuanto esté lista.`;
    } else {
      mensajeParaEnviar = `Ya lo tengo anotado. Lo reviso y te confirmo en cuanto quede listo.`;
    }
  } else {
    mensajeParaEnviar = "No aplica.";
  }

  const activeTasks = updatedTasks.filter((t) => t.estado !== "Completado");
  const tareaEsencialId = activeTasks[0]?.id || null;
  const tareasSecundariasIds = activeTasks.slice(1, 3).map((t) => t.id);

  const mensajesMultiples: Array<{ destinatario: string; telefono?: string; mensaje: string }> = [];
  if (mensajeParaEnviar && mensajeParaEnviar !== "No aplica.") {
    mensajesMultiples.push({
      destinatario: solicitante,
      telefono: matchedContact?.telefono,
      mensaje: mensajeParaEnviar,
    });
  }

  return {
    mensajeParaEnviar,
    mensajesMultiples,
    tasks: updatedTasks,
    tareaEsencialId,
    tareasSecundariasIds,
    activarPomodoro: false,
    resumenAccion: `Tarea registrada con ID #${nextId} para ${solicitante}${imageBase64 ? " con imagen de referencia" : ""}`,
  };
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Task-OS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
