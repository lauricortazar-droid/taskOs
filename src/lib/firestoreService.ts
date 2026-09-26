import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { TaskItem } from "../types";

export interface UserProfileData {
  userId: string;
  email?: string;
  displayName?: string;
  esencialTaskId?: number | null;
  secundariasTaskIds?: number[];
  updatedAt?: string;
}

// Convert local TaskItem into a clean payload for Firestore conforming to isValidTask
function sanitizeTaskForFirestore(task: TaskItem, userId: string) {
  const payload: Record<string, any> = {
    userId,
    tarea: (task.tarea || "").trim().slice(0, 1000) || "Tarea sin título",
    estado:
      task.estado === "Completado"
        ? "Completada"
        : task.estado === "En Proceso"
        ? "En Proceso"
        : "Pendiente",
    fechaIngreso: (task.fechaIngreso || new Date().toISOString().split("T")[0]).slice(0, 30),
  };

  if (task.fechaLimite) payload.fechaLimite = task.fechaLimite.slice(0, 30);
  if (task.dominio) payload.dominio = task.dominio.slice(0, 100);
  if (task.notas) payload.notas = task.notas.slice(0, 5000);
  if (task.solicitante) payload.solicitante = task.solicitante.slice(0, 150);
  if (task.contacto?.telefono) payload.telefono = task.contacto.telefono.slice(0, 50);
  if (Array.isArray(task.etiquetas) && task.etiquetas.length > 0) {
    payload.etiquetas = task.etiquetas.slice(0, 20).map((t) => String(t).slice(0, 50));
  }

  return payload;
}

// Save or Update a single task in Firestore
export async function saveTaskToFirestore(userId: string, task: TaskItem): Promise<void> {
  const taskIdStr = String(task.id);
  const taskRef = doc(db, "users", userId, "tasks", taskIdStr);
  const payload = sanitizeTaskForFirestore(task, userId);

  try {
    await setDoc(taskRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/tasks/${taskIdStr}`);
  }
}

// Batch save multiple tasks into Firestore
export async function batchSyncTasksToFirestore(userId: string, tasks: TaskItem[]): Promise<void> {
  const path = `users/${userId}/tasks`;
  try {
    const batch = writeBatch(db);
    tasks.forEach((task) => {
      const taskRef = doc(db, "users", userId, "tasks", String(task.id));
      const payload = sanitizeTaskForFirestore(task, userId);
      batch.set(taskRef, payload, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete task from Firestore
export async function deleteTaskFromFirestore(userId: string, taskId: number): Promise<void> {
  const taskIdStr = String(taskId);
  const taskRef = doc(db, "users", userId, "tasks", taskIdStr);
  try {
    await deleteDoc(taskRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/tasks/${taskIdStr}`);
  }
}

// Load all tasks once from Firestore
export async function loadTasksFromFirestore(userId: string): Promise<TaskItem[]> {
  const path = `users/${userId}/tasks`;
  try {
    const querySnapshot = await getDocs(collection(db, "users", userId, "tasks"));
    const tasks: TaskItem[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const idNum = parseInt(docSnap.id, 10);
      if (!isNaN(idNum)) {
        tasks.push({
          id: idNum,
          tarea: data.tarea || "",
          estado: data.estado === "Completada" ? "Completado" : data.estado || "Pendiente",
          fechaIngreso: data.fechaIngreso || new Date().toISOString().split("T")[0],
          fechaLimite: data.fechaLimite || undefined,
          dominio: data.dominio || "General",
          solicitante: data.solicitante || "Pepe",
          contacto: data.telefono
            ? { nombre: data.solicitante || "Contacto", telefono: data.telefono }
            : undefined,
          etiquetas: Array.isArray(data.etiquetas) ? data.etiquetas : [],
          notas: data.notas || undefined,
        });
      }
    });

    return tasks.sort((a, b) => a.id - b.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Subscribe to real-time updates from Firestore
export function subscribeToFirestoreTasks(
  userId: string,
  onTasksChange: (tasks: TaskItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${userId}/tasks`;
  const unsubscribe = onSnapshot(
    collection(db, "users", userId, "tasks"),
    (snapshot) => {
      const tasks: TaskItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const idNum = parseInt(docSnap.id, 10);
        if (!isNaN(idNum)) {
          tasks.push({
            id: idNum,
            tarea: data.tarea || "",
            estado: data.estado === "Completada" ? "Completado" : data.estado || "Pendiente",
            fechaIngreso: data.fechaIngreso || new Date().toISOString().split("T")[0],
            fechaLimite: data.fechaLimite || undefined,
            dominio: data.dominio || "General",
            solicitante: data.solicitante || "Pepe",
            contacto: data.telefono
              ? { nombre: data.solicitante || "Contacto", telefono: data.telefono }
              : undefined,
            etiquetas: Array.isArray(data.etiquetas) ? data.etiquetas : [],
            notas: data.notas || undefined,
          });
        }
      });
      onTasksChange(tasks.sort((a, b) => a.id - b.id));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );

  return unsubscribe;
}

// User Profile & Focus State sync
export async function saveProfileToFirestore(
  userId: string,
  profile: Partial<UserProfileData>
): Promise<void> {
  const path = `users/${userId}/profile/info`;
  try {
    const profileRef = doc(db, "users", userId, "profile", "info");
    const payload: Record<string, any> = {
      userId,
      updatedAt: new Date().toISOString(),
    };
    if (profile.email) payload.email = profile.email.slice(0, 200);
    if (profile.displayName) payload.displayName = profile.displayName.slice(0, 100);
    if (typeof profile.esencialTaskId === "number") payload.esencialTaskId = profile.esencialTaskId;
    if (Array.isArray(profile.secundariasTaskIds)) payload.secundariasTaskIds = profile.secundariasTaskIds;

    await setDoc(profileRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
