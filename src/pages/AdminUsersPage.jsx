/**
 * Admin internal users and roles management page.
 */

import { useEffect, useMemo, useState } from "react";
import {
  createInternalUser,
  sendInternalUserResetEmail,
  subscribeInternalUsers,
  updateInternalUser,
} from "../services/userService";
import { useAuth } from "../hooks/useAuth";
import { getRoleLabel } from "../utils/permissions";

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "agent", label: "Agente" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

function createEmptyForm() {
  return {
    name: "",
    email: "",
    password: "",
    role: "agent",
    active: true,
  };
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function roleBadgeClass(role) {
  if (role === "admin") {
    return "badge-info";
  }

  if (role === "agent") {
    return "badge-success";
  }

  return "badge-neutral";
}

function statusBadgeClass(active) {
  return active ? "badge-success" : "badge-warning";
}

function StatCard({ label, value, help }) {
  return (
    <div className="card-base p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-[#888888]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-[#E0E0E0]">{value}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-[#B0B0B0]">{help}</p>
    </div>
  );
}

function UserEditModal({ user, currentUserId, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    role: user?.role || "agent",
    active: user?.active !== false,
  });
  const isSelf = user?.id === currentUserId;

  useEffect(() => {
    setForm({
      name: user?.name || "",
      role: user?.role || "agent",
      active: user?.active !== false,
    });
  }, [user]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-[2px]">
      <div className="card-base w-full max-w-lg overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-[#444444]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-[#888888]">
            Editar usuario interno
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
            {user.name || user.email || "Usuario interno"}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-[#B0B0B0]">
            Ajusta nombre visible, rol y estado sin salir del panel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="label-base" htmlFor="edit-internal-user-name">
              Nombre visible
            </label>
            <input
              id="edit-internal-user-name"
              className="input-base"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Nombre completo o alias profesional"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label-base" htmlFor="edit-internal-user-role">
                Rol
              </label>
              <select
                id="edit-internal-user-role"
                className="input-base"
                value={form.role}
                disabled={isSelf}
                onChange={(event) =>
                  setForm((current) => ({ ...current, role: event.target.value }))
                }
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {isSelf ? (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                  Tu propio rol no se cambia desde esta pantalla.
                </p>
              ) : null}
            </div>

            <div>
              <label className="label-base" htmlFor="edit-internal-user-status">
                Estado
              </label>
              <select
                id="edit-internal-user-status"
                className="input-base"
                value={form.active ? "active" : "inactive"}
                disabled={isSelf}
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.value === "active" }))
                }
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
              {isSelf ? (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                  Tu propio acceso no se desactiva desde aquí.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-[#444444] dark:bg-[#121212] dark:text-[#B0B0B0]">
            Correo autenticado: <span className="font-medium">{user.email || "Sin correo"}</span>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminUsersPage() {
  const { currentUser, hasPermission } = useAuth();
  const [internalUsers, setInternalUsers] = useState([]);
  const [listError, setListError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [createForm, setCreateForm] = useState(createEmptyForm());
  const [createLoading, setCreateLoading] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const unsubscribe = subscribeInternalUsers(
      (users) => {
        setInternalUsers(users);
        setListError("");
      },
      (error) => {
        setListError(error?.message || "No fue posible cargar los usuarios internos.");
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = String(searchTerm || "").trim().toLowerCase();

    return internalUsers.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        String(user.name || "").toLowerCase().includes(normalizedSearch) ||
        String(user.email || "").toLowerCase().includes(normalizedSearch);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? user.active !== false : user.active === false);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [internalUsers, roleFilter, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = internalUsers.length;
    const admins = internalUsers.filter((user) => user.role === "admin").length;
    const agents = internalUsers.filter((user) => user.role === "agent").length;
    const inactive = internalUsers.filter((user) => user.active === false).length;

    return { total, admins, agents, inactive };
  }, [internalUsers]);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setFeedback({ type: "", message: "" });
    setCreateLoading(true);

    try {
      await createInternalUser(createForm, currentUser);
      setCreateForm(createEmptyForm());
      setFeedback({
        type: "success",
        message: "Usuario interno creado correctamente. Ya puedes compartir el acceso inicial.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message || "No fue posible crear el usuario interno.",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveEdit = async (payload) => {
    if (!editTarget) {
      return;
    }

    if (editTarget.id === currentUser?.uid) {
      if (payload.role !== editTarget.role) {
        setFeedback({
          type: "error",
          message: "No puedes cambiar tu propio rol desde esta pantalla.",
        });
        return;
      }

      if (payload.active === false) {
        setFeedback({
          type: "error",
          message: "No puedes desactivar tu propio acceso desde esta pantalla.",
        });
        return;
      }
    }

    setEditLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      await updateInternalUser(editTarget.id, payload);
      setEditTarget(null);
      setFeedback({
        type: "success",
        message: "Usuario interno actualizado correctamente.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message || "No fue posible actualizar el usuario interno.",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleSendReset = async (user) => {
    setFeedback({ type: "", message: "" });

    try {
      await sendInternalUserResetEmail(user.email);
      setFeedback({
        type: "success",
        message: `Se envió un correo de restablecimiento a ${user.email}.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message || "No fue posible enviar el correo de restablecimiento.",
      });
    }
  };

  if (!hasPermission?.("users.manage")) {
    return (
      <section className="space-y-4">
        <div className="card-base p-6">
          <h1 className="section-title">Equipo y roles</h1>
          <p className="section-subtitle mt-2">
            No tienes permisos para administrar usuarios internos desde este panel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="card-base p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-[#888888]">
              Administración interna
            </p>
            <h1 className="section-title mt-2">Equipo y roles</h1>
            <p className="section-subtitle mt-3 max-w-3xl">
              Desde aquí defines qué usuarios internos son administradores o agentes. Los accesos
              de clientes siguen administrándose desde la página de clientes.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-[#444444] dark:bg-[#121212] dark:text-[#B0B0B0]">
            Eliminación de cuentas Auth: <span className="font-medium">manual en Firebase</span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuarios internos" value={stats.total} help="Total de administradores y agentes." />
        <StatCard label="Administradores" value={stats.admins} help="Acceso total al sistema." />
        <StatCard label="Agentes" value={stats.agents} help="Operación amplia con límites sensibles." />
        <StatCard label="Inactivos" value={stats.inactive} help="Accesos temporalmente deshabilitados." />
      </div>

      {feedback.message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {listError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
          {listError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
              Crear usuario interno
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-[#B0B0B0]">
              Crea accesos internos para administradores o agentes con credenciales iniciales.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleCreateUser}>
              <div>
                <label className="label-base" htmlFor="internal-user-name">
                  Nombre visible
                </label>
                <input
                  id="internal-user-name"
                  className="input-base"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Nombre completo o alias del colaborador"
                />
              </div>

              <div>
                <label className="label-base" htmlFor="internal-user-email">
                  Correo de acceso
                </label>
                <input
                  id="internal-user-email"
                  type="email"
                  className="input-base"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="correo@moonforge.digital"
                />
              </div>

              <div>
                <label className="label-base" htmlFor="internal-user-password">
                  Contraseña inicial
                </label>
                <input
                  id="internal-user-password"
                  type="password"
                  className="input-base"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label-base" htmlFor="internal-user-role">
                    Rol inicial
                  </label>
                  <select
                    id="internal-user-role"
                    className="input-base"
                    value={createForm.role}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, role: event.target.value }))
                    }
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-base" htmlFor="internal-user-active">
                    Estado inicial
                  </label>
                  <select
                    id="internal-user-active"
                    className="input-base"
                    value={createForm.active ? "active" : "inactive"}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        active: event.target.value === "active",
                      }))
                    }
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={createLoading}>
                {createLoading ? "Creando usuario..." : "Crear usuario interno"}
              </button>
            </form>
          </div>

          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
              Reglas prácticas
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-[#B0B0B0]">
              <li>• Usa <span className="font-medium">admin</span> solo para dueños o responsables del sistema.</li>
              <li>• Usa <span className="font-medium">agent</span> para operación diaria sin acciones sensibles.</li>
              <li>• El restablecimiento de contraseña se envía por correo desde este panel.</li>
              <li>• La eliminación completa en Firebase Authentication sigue siendo manual.</li>
            </ul>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="card-base p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
                  Usuarios internos actuales
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-[#B0B0B0]">
                  Edita nombre visible, rol y estado operativo de cada acceso interno.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
                <div>
                  <label className="label-base" htmlFor="staff-search">
                    Buscar
                  </label>
                  <input
                    id="staff-search"
                    className="input-base"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Nombre o correo"
                  />
                </div>

                <div>
                  <label className="label-base" htmlFor="staff-role-filter">
                    Rol
                  </label>
                  <select
                    id="staff-role-filter"
                    className="input-base"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                  >
                    <option value="all">Todos</option>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-base" htmlFor="staff-status-filter">
                    Estado
                  </label>
                  <select
                    id="staff-status-filter"
                    className="input-base"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-[#444444] dark:text-[#B0B0B0]">
                  No hay usuarios internos que coincidan con los filtros actuales.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.uid;

                  return (
                    <article
                      key={user.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors duration-300 dark:border-[#444444] dark:bg-[#121212]"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">
                              {user.name || "Sin nombre visible"}
                            </h3>
                            <span className={roleBadgeClass(user.role)}>{getRoleLabel(user.role)}</span>
                            <span className={statusBadgeClass(user.active !== false)}>
                              {user.active !== false ? "Activo" : "Inactivo"}
                            </span>
                            {isSelf ? <span className="badge-neutral">Tu cuenta</span> : null}
                          </div>

                          <div className="mt-3 grid gap-3 text-sm text-slate-600 dark:text-[#B0B0B0] md:grid-cols-2">
                            <p>
                              <span className="font-medium text-slate-700 dark:text-[#E0E0E0]">Correo:</span>{" "}
                              {user.email || "No definido"}
                            </p>
                            <p>
                              <span className="font-medium text-slate-700 dark:text-[#E0E0E0]">Creado:</span>{" "}
                              {formatDateTime(user.createdAt)}
                            </p>
                            <p>
                              <span className="font-medium text-slate-700 dark:text-[#E0E0E0]">Actualizado:</span>{" "}
                              {formatDateTime(user.updatedAt)}
                            </p>
                            <p>
                              <span className="font-medium text-slate-700 dark:text-[#E0E0E0]">Creado por:</span>{" "}
                              {user.createdByName || "Sistema"}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-3">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setEditTarget(user)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleSendReset(user)}
                          >
                            Resetear clave
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <UserEditModal
        user={editTarget}
        currentUserId={currentUser?.uid}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        saving={editLoading}
      />
    </section>
  );
}

export default AdminUsersPage;
