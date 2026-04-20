import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../hooks/useAuth";
import {
  createBoardTask,
  deleteBoardTask,
  moveBoardTask,
  subscribeBoardTasks,
  updateBoardTask,
} from "../services/boardService";

const TOKENS = {
  bg: "var(--app-bg)",
  surface: "var(--app-surface)",
  surfaceMuted: "var(--app-surface-muted)",
  border: "var(--app-border)",
  text: "var(--app-text)",
  textMuted: "var(--app-text-muted)",
};

const BOARD_COLUMNS = [
  {
    key: "todo",
    label: "TO DO",
    title: "To do",
    badgeClass:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dotClass: "bg-slate-500",
  },
  {
    key: "in_progress",
    label: "IN PROGRESS",
    title: "En proceso",
    badgeClass:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    dotClass: "bg-blue-500",
  },
  {
    key: "in_review",
    label: "IN REVIEW",
    title: "En revisión",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  {
    key: "done",
    label: "DONE",
    title: "Completadas",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const PRIORITY_BADGES = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  priority: "medium",
  assigneeUid: "",
  assigneeName: "",
  assigneeQuery: "",
};

const ALL_ASSIGNEE_OPTION = {
  id: "all",
  name: "Todos",
  email: "Aplica para todo el equipo",
  role: "team",
};

const ui = {
  panel: {
    backgroundColor: TOKENS.surface,
    borderColor: TOKENS.border,
    color: TOKENS.text,
  },
  surfaceMuted: {
    backgroundColor: TOKENS.surfaceMuted,
    borderColor: TOKENS.border,
    color: TOKENS.text,
  },
  input: {
    backgroundColor: TOKENS.surfaceMuted,
    borderColor: TOKENS.border,
    color: TOKENS.text,
  },
  card: {
    backgroundColor: TOKENS.surface,
    borderColor: TOKENS.border,
    color: TOKENS.text,
  },
  menu: {
    backgroundColor: TOKENS.surface,
    borderColor: TOKENS.border,
    color: TOKENS.text,
  },
  mutedText: {
    color: TOKENS.textMuted,
  },
  text: {
    color: TOKENS.text,
  },
  countBubble: {
    backgroundColor: TOKENS.surface,
    borderColor: TOKENS.border,
    color: TOKENS.text,
  },
  avatar: {
    backgroundColor: TOKENS.surfaceMuted,
    color: TOKENS.text,
  },
  divider: {
    borderColor: TOKENS.border,
  },
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function getUserDisplayName(user) {
  return (
    normalizeText(user?.name) ||
    normalizeText(user?.displayName) ||
    normalizeText(user?.email) ||
    "Sin nombre"
  );
}

function formatDate(value) {
  if (!value) return "Sin fecha";

  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);

    return new Intl.DateTimeFormat("es-CR", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "Sin fecha";
  }
}

function getPriorityLabel(value) {
  return PRIORITY_OPTIONS.find((item) => item.value === value)?.label || "Media";
}

function getPriorityBadgeClass(value) {
  return PRIORITY_BADGES[value] || PRIORITY_BADGES.medium;
}

function getPrevStatus(status) {
  const index = BOARD_COLUMNS.findIndex((column) => column.key === status);
  if (index <= 0) return null;
  return BOARD_COLUMNS[index - 1].key;
}

function getNextStatus(status) {
  const index = BOARD_COLUMNS.findIndex((column) => column.key === status);
  if (index < 0 || index === BOARD_COLUMNS.length - 1) return null;
  return BOARD_COLUMNS[index + 1].key;
}

function mapTaskToForm(task) {
  return {
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "medium",
    assigneeUid: task?.assigneeUid || "",
    assigneeName: task?.assigneeName || "",
    assigneeQuery: task?.assigneeName || "",
  };
}

function getInitials(name) {
  const normalized = normalizeText(name);
  if (!normalized) return "SN";

  const parts = normalized.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "SN";
}

function SearchBox({ value, onChange }) {
  return (
    <div className="relative w-full max-w-md">
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        style={ui.mutedText}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        />
      </svg>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar tareas"
        className="h-10 w-full rounded-md border pl-10 pr-3 text-sm outline-none transition"
        style={ui.input}
      />
    </div>
  );
}

function MemberAutocomplete({
  teamMembers,
  assigneeQuery,
  selectedMemberId,
  onQueryChange,
  onSelect,
  onClear,
}) {
  const normalizedQuery = normalizeText(assigneeQuery).toLowerCase();

  const options = useMemo(() => {
    const base = [ALL_ASSIGNEE_OPTION, ...teamMembers];
    const items = normalizedQuery
      ? base.filter((member) => {
          const haystack = `${member.name || ""} ${member.email || ""}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : base;

    const dedup = [];
    const used = new Set();

    for (const item of items) {
      const key = `${item.id}`;
      if (!used.has(key)) {
        used.add(key);
        dedup.push(item);
      }
    }

    return dedup.slice(0, 8);
  }, [teamMembers, normalizedQuery]);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={assigneeQuery}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar responsable del equipo..."
        className="w-full rounded-md border px-3 py-2.5 text-sm outline-none transition"
        style={ui.input}
      />

      {selectedMemberId ? (
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium underline-offset-4 hover:underline"
          style={ui.mutedText}
        >
          Limpiar selección
        </button>
      ) : null}

      <div
        className="max-h-56 overflow-y-auto rounded-md border"
        style={ui.panel}
      >
        {options.length === 0 ? (
          <div className="px-3 py-3 text-sm" style={ui.mutedText}>
            No se encontraron miembros.
          </div>
        ) : (
          options.map((member) => {
            const selected = selectedMemberId === member.id;

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onSelect(member)}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition"
                style={{
                  backgroundColor: selected ? TOKENS.surfaceMuted : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.backgroundColor = TOKENS.surfaceMuted;
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={ui.text}>
                    {getUserDisplayName(member)}
                  </p>
                  <p className="truncate text-xs" style={ui.mutedText}>
                    {member.email || "Sin correo"}
                  </p>
                </div>

                <span
                  className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={ui.surfaceMuted}
                >
                  {member.role}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function TaskModal({
  open,
  mode,
  form,
  saving,
  teamMembers,
  canCreateTask,
  onClose,
  onFieldChange,
  onQueryChange,
  onSelectMember,
  onClearMember,
  onSubmit,
}) {
  if (!open) return null;

  const isCreate = mode === "create";

  return (
    <div className="fixed inset-0 z-[90] bg-black/60">
      <div className="flex h-full w-full items-end justify-center p-2 sm:items-center sm:p-4">
        <div
          className="flex h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)]"
          style={ui.panel}
        >
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={ui.divider}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={ui.mutedText}>
                {isCreate ? "Nueva tarea" : "Editar tarea"}
              </p>
              <h3 className="mt-2 text-xl font-semibold" style={ui.text}>
                {isCreate ? "Crear tarea interna" : "Actualizar tarea"}
              </h3>
              <p className="mt-2 text-sm leading-6" style={ui.mutedText}>
                {isCreate
                  ? "Las tareas nuevas siempre se crean en To do."
                  : "Edita la tarea sin romper el flujo del tablero."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-3 py-2 text-sm font-medium transition"
              style={ui.input}
            >
              Cerrar
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="space-y-2">
                <label className="text-sm font-medium" style={ui.text}>
                  Título
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => onFieldChange("title", event.target.value)}
                  placeholder="Ejemplo: Revisar accesos pendientes del cliente"
                  className="w-full rounded-md border px-3 py-2.5 text-sm outline-none transition"
                  style={ui.input}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={ui.text}>
                    Prioridad
                  </label>
                  <select
                    value={form.priority}
                    onChange={(event) => onFieldChange("priority", event.target.value)}
                    className="w-full rounded-md border px-3 py-2.5 text-sm outline-none transition"
                    style={ui.input}
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={ui.text}>
                    Estado inicial
                  </label>
                  <div
                    className="flex h-[42px] items-center rounded-md border px-3 text-sm"
                    style={ui.surfaceMuted}
                  >
                    To do
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={ui.text}>
                  Descripción
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => onFieldChange("description", event.target.value)}
                  placeholder="Describe la tarea, contexto, objetivo o detalles relevantes."
                  className="w-full rounded-md border px-3 py-2.5 text-sm leading-6 outline-none transition"
                  style={ui.input}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={ui.text}>
                  Responsable
                </label>

                <MemberAutocomplete
                  teamMembers={teamMembers}
                  assigneeQuery={form.assigneeQuery}
                  selectedMemberId={form.assigneeUid}
                  onQueryChange={onQueryChange}
                  onSelect={onSelectMember}
                  onClear={onClearMember}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-5 py-4" style={ui.divider}>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border px-4 py-2.5 text-sm font-medium transition"
                style={ui.input}
              >
                Cancelar
              </button>

              {isCreate && !canCreateTask ? null : (
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {saving
                    ? "Guardando..."
                    : isCreate
                    ? "Crear tarea"
                    : "Guardar cambios"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TaskMenu({
  task,
  canDeleteTask,
  onEdit,
  onComplete,
  onReopen,
  onMovePrev,
  onMoveNext,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const prevStatus = getPrevStatus(task.status);
  const nextStatus = getNextStatus(task.status);

  useEffect(() => {
    function handleOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const itemClass = "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition"
        style={ui.input}
        aria-label="Acciones de la tarea"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          style={ui.mutedText}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 5.5h.01M12 12h.01M12 18.5h.01"
          />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-20 w-48 rounded-md border p-1 shadow-lg" style={ui.menu}>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit(task);
            }}
            className={itemClass}
            style={ui.text}
          >
            Editar
          </button>

          {task.status === "done" ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReopen(task);
              }}
              className={itemClass}
              style={ui.text}
            >
              Reabrir
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onComplete(task);
              }}
              className={itemClass}
              style={ui.text}
            >
              Marcar completada
            </button>
          )}

          {prevStatus ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onMovePrev(task);
              }}
              className={itemClass}
              style={ui.text}
            >
              Mover a la izquierda
            </button>
          ) : null}

          {nextStatus ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onMoveNext(task);
              }}
              className={itemClass}
              style={ui.text}
            >
              Mover a la derecha
            </button>
          ) : null}

          {canDeleteTask ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete(task);
              }}
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
            >
              Eliminar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BoardCard({
  task,
  canDeleteTask,
  onEdit,
  onComplete,
  onReopen,
  onMovePrev,
  onMoveNext,
  onDelete,
  onDragStart,
  onDragEnd,
}) {
  return (
    <article
      draggable
      onDragStart={(event) => onDragStart(event, task)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(task)}
      className="cursor-pointer rounded-md border px-3 py-3 shadow-sm transition hover:shadow-md"
      style={ui.card}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-5" style={ui.text}>
            {task.title || "Sin título"}
          </h3>

          {task.description ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-5" style={ui.mutedText}>
              {task.description}
            </p>
          ) : null}
        </div>

        <div onClick={(event) => event.stopPropagation()}>
          <TaskMenu
            task={task}
            canDeleteTask={canDeleteTask}
            onEdit={onEdit}
            onComplete={onComplete}
            onReopen={onReopen}
            onMovePrev={onMovePrev}
            onMoveNext={onMoveNext}
            onDelete={onDelete}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getPriorityBadgeClass(
            task.priority
          )}`}
        >
          {getPriorityLabel(task.priority)}
        </span>

        <span className="text-[11px]" style={ui.mutedText}>
          {formatDate(task.updatedAt)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
            style={ui.avatar}
          >
            {getInitials(task.assigneeName)}
          </div>
          <p className="truncate text-xs font-medium" style={ui.text}>
            {task.assigneeName || "Sin asignar"}
          </p>
        </div>

        <span className="text-[11px] font-medium" style={ui.mutedText}>
          {task.id?.slice(0, 6).toUpperCase() || "TASK"}
        </span>
      </div>
    </article>
  );
}

function BoardLane({
  column,
  tasks,
  canDeleteTask,
  canCreateHere,
  isDragOver,
  onCreate,
  onEdit,
  onComplete,
  onReopen,
  onMovePrev,
  onMoveNext,
  onDelete,
  onDropTask,
  onDragEnterLane,
  onDragLeaveLane,
  onDragStartCard,
  onDragEndCard,
}) {
  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragEnter={() => onDragEnterLane(column.key)}
      onDragLeave={() => onDragLeaveLane(column.key)}
      onDrop={(event) => onDropTask(event, column.key)}
      className={`flex h-[560px] w-[280px] shrink-0 flex-col rounded-md border p-3 transition ${
        isDragOver ? "ring-2 ring-slate-300 dark:ring-slate-700" : ""
      }`}
      style={ui.surfaceMuted}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${column.badgeClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${column.dotClass}`} />
            {column.label}
          </div>
        </div>

        <span
          className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-semibold"
          style={ui.countBubble}
        >
          {tasks.length}
        </span>
      </div>

      <h2 className="mt-3 text-sm font-semibold" style={ui.text}>
        {column.title}
      </h2>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 scroll-smooth">
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div
              className="rounded-md border border-dashed px-3 py-10 text-center text-sm"
              style={ui.card}
            >
              <span style={ui.mutedText}>No hay tareas en esta columna.</span>
            </div>
          ) : (
            tasks.map((task) => (
              <BoardCard
                key={task.id}
                task={task}
                canDeleteTask={canDeleteTask}
                onEdit={onEdit}
                onComplete={onComplete}
                onReopen={onReopen}
                onMovePrev={onMovePrev}
                onMoveNext={onMoveNext}
                onDelete={onDelete}
                onDragStart={onDragStartCard}
                onDragEnd={onDragEndCard}
              />
            ))
          )}
        </div>
      </div>

      {canCreateHere ? (
        <div className="mt-3 border-t pt-3" style={ui.divider}>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 text-sm font-medium transition"
            style={ui.mutedText}
          >
            <span className="text-base leading-none">+</span>
            Crear
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default function AdminBoardPage() {
  const { currentUser } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersError, setMembersError] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draggingTaskId, setDraggingTaskId] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState("");

  const role = String(currentUser?.role || "").toLowerCase();
  const canCreateTask = role === "admin";
  const canDeleteTask = role === "admin";

  useEffect(() => {
    const unsubscribe = subscribeBoardTasks(
      (items) => {
        setTasks(items);
        setLoading(false);
        setError("");
      },
      (subscriptionError) => {
        console.error(subscriptionError);
        setError("No fue posible cargar el tablero.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadTeamMembers() {
      try {
        setMembersError("");

        const usersRef = collection(db, "users");
        const usersQuery = query(usersRef, where("role", "in", ["admin", "agent"]));
        const snapshot = await getDocs(usersQuery);

        const items = snapshot.docs
          .map((documentSnapshot) => ({
            id: documentSnapshot.id,
            ...documentSnapshot.data(),
          }))
          .sort((a, b) =>
            getUserDisplayName(a).localeCompare(getUserDisplayName(b), "es")
          );

        setTeamMembers(items);
      } catch (loadError) {
        console.error(loadError);
        setMembersError("No fue posible cargar los miembros del equipo.");
      }
    }

    loadTeamMembers();
  }, []);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [modalOpen]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = normalizeText(search).toLowerCase();

    if (!normalizedSearch) {
      return tasks;
    }

    return tasks.filter((task) => {
      const haystack = [
        task.title,
        task.description,
        task.assigneeName,
        task.createdByName,
        task.priority,
        task.status,
      ]
        .map((item) => normalizeText(item).toLowerCase())
        .join(" ");

      return haystack.includes(normalizedSearch);
    });
  }, [tasks, search]);

  const groupedTasks = useMemo(() => {
    return BOARD_COLUMNS.reduce((accumulator, column) => {
      accumulator[column.key] = filteredTasks.filter((task) => task.status === column.key);
      return accumulator;
    }, {});
  }, [filteredTasks]);

  function resetModal() {
    setModalOpen(false);
    setModalMode("create");
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setSaving(false);
  }

  function openCreateModal() {
    if (!canCreateTask) return;
    setModalMode("create");
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(task) {
    setModalMode("edit");
    setEditingTask(task);
    setForm(mapTaskToForm(task));
    setModalOpen(true);
  }

  function handleFieldChange(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleAssigneeQueryChange(value) {
    setForm((current) => ({
      ...current,
      assigneeQuery: value,
      assigneeUid: "",
      assigneeName: "",
    }));
  }

  function handleAssigneeSelect(member) {
    const displayName = member.id === "all" ? "Todos" : getUserDisplayName(member);

    setForm((current) => ({
      ...current,
      assigneeUid: member.id,
      assigneeName: displayName,
      assigneeQuery: displayName,
    }));
  }

  function handleAssigneeClear() {
    setForm((current) => ({
      ...current,
      assigneeUid: "",
      assigneeName: "",
      assigneeQuery: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const title = normalizeText(form.title);
    if (!title) {
      window.alert("Debes indicar un título.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title,
        description: form.description,
        priority: form.priority,
        assigneeUid: form.assigneeUid || "",
        assigneeName: form.assigneeName || "",
        order: editingTask?.order ?? Date.now(),
      };

      if (modalMode === "edit" && editingTask) {
        await updateBoardTask(editingTask.id, payload, currentUser);
      } else {
        await createBoardTask(payload, currentUser);
      }

      resetModal();
    } catch (submitError) {
      console.error(submitError);
      window.alert(submitError?.message || "No fue posible guardar la tarea.");
      setSaving(false);
    }
  }

  async function handleMove(task, nextStatus) {
    if (!nextStatus) return;

    try {
      await moveBoardTask(task.id, nextStatus, Date.now(), currentUser);
    } catch (moveError) {
      console.error(moveError);
      window.alert("No fue posible mover la tarea.");
    }
  }

  async function handleComplete(task) {
    try {
      await moveBoardTask(task.id, "done", Date.now(), currentUser);
    } catch (completeError) {
      console.error(completeError);
      window.alert("No fue posible completar la tarea.");
    }
  }

  async function handleReopen(task) {
    try {
      await moveBoardTask(task.id, "todo", Date.now(), currentUser);
    } catch (reopenError) {
      console.error(reopenError);
      window.alert("No fue posible reabrir la tarea.");
    }
  }

  async function handleDelete(task) {
    const confirmed = window.confirm(`¿Eliminar la tarea "${task.title}"?`);
    if (!confirmed) return;

    try {
      await deleteBoardTask(task.id);
    } catch (deleteError) {
      console.error(deleteError);
      window.alert("No fue posible eliminar la tarea.");
    }
  }

  function handleDragStart(event, task) {
    setDraggingTaskId(task.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  }

  function handleDragEnd() {
    setDraggingTaskId("");
    setDragOverColumn("");
  }

  function handleDragEnterLane(columnKey) {
    if (draggingTaskId) {
      setDragOverColumn(columnKey);
    }
  }

  function handleDragLeaveLane(columnKey) {
    if (dragOverColumn === columnKey) {
      setDragOverColumn("");
    }
  }

  async function handleDropTask(event, columnKey) {
    event.preventDefault();

    const taskId = event.dataTransfer.getData("text/plain") || draggingTaskId;
    const task = tasks.find((item) => item.id === taskId);

    setDragOverColumn("");
    setDraggingTaskId("");

    if (!task) return;
    if (task.status === columnKey) return;

    try {
      await moveBoardTask(task.id, columnKey, Date.now(), currentUser);
    } catch (dropError) {
      console.error(dropError);
      window.alert("No fue posible mover la tarea.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border px-4 py-4 shadow-sm" style={ui.panel}>
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={ui.mutedText}>
              Tickets / Board
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight" style={ui.text}>
              Board
            </h1>

            <p className="mt-2 text-sm" style={ui.mutedText}>
              Tablero interno de trabajo del equipo.
            </p>
          </div>

          <SearchBox value={search} onChange={setSearch} />
        </div>

        {membersError ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            {membersError}
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border p-3 shadow-sm" style={ui.panel}>
        {loading ? (
          <div className="py-10 text-sm" style={ui.mutedText}>
            Cargando tablero...
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {BOARD_COLUMNS.map((column) => (
                <BoardLane
                  key={column.key}
                  column={column}
                  tasks={groupedTasks[column.key] || []}
                  canDeleteTask={canDeleteTask}
                  canCreateHere={canCreateTask && column.key === "todo"}
                  isDragOver={dragOverColumn === column.key}
                  onCreate={openCreateModal}
                  onEdit={openEditModal}
                  onComplete={handleComplete}
                  onReopen={handleReopen}
                  onMovePrev={(task) => handleMove(task, getPrevStatus(task.status))}
                  onMoveNext={(task) => handleMove(task, getNextStatus(task.status))}
                  onDelete={handleDelete}
                  onDropTask={handleDropTask}
                  onDragEnterLane={handleDragEnterLane}
                  onDragLeaveLane={handleDragLeaveLane}
                  onDragStartCard={handleDragStart}
                  onDragEndCard={handleDragEnd}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <TaskModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        saving={saving}
        teamMembers={teamMembers}
        canCreateTask={canCreateTask}
        onClose={resetModal}
        onFieldChange={handleFieldChange}
        onQueryChange={handleAssigneeQueryChange}
        onSelectMember={handleAssigneeSelect}
        onClearMember={handleAssigneeClear}
        onSubmit={handleSubmit}
      />
    </div>
  );
}