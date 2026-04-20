/**
 * Internal staff users and roles management page.
 */

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  createInternalUser,
  sendInternalUserResetEmail,
  subscribeInternalUsers,
  updateInternalUser,
} from "../services/userService";
import { getRoleLabel } from "../utils/permissions";

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
        {label}
      </p>
      <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
        {value || "No definido"}
      </p>
    </div>
  );
}

function StatusBadge({ text }) {
  return <span className="badge-neutral">{text}</span>;
}

function createEmptyForm() {
  return {
    name: "",
    email: "",
    password: "",
    role: "agent",
    active: true,
  };
}

function AdminUsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState(createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeInternalUsers(
      (data) => {
        setUsers(data);
        setLoading(false);
      },
      () => {
        setErrorMessage("No fue posible cargar el equipo interno.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      if (!term) return true;

      return [user.name, user.email, user.role, user.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [users, search]);

  const resetForm = () => {
    setEditingUserId("");
    setForm(createEmptyForm());
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "agent",
      active: user.active !== false,
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!form.name.trim()) {
        throw new Error("El nombre del usuario es obligatorio.");
      }

      if (editingUserId) {
        if (
          editingUserId === currentUser?.uid &&
          (form.role !== "admin" || form.active === false)
        ) {
          throw new Error("No puede degradar ni desactivar su propia cuenta desde esta pantalla.");
        }

        await updateInternalUser(editingUserId, form);
        setSuccessMessage("Usuario interno actualizado correctamente.");
      } else {
        if (!form.email.trim()) {
          throw new Error("El correo del usuario es obligatorio.");
        }

        if (String(form.password || "").trim().length < 6) {
          throw new Error("La contraseña inicial debe tener al menos 6 caracteres.");
        }

        await createInternalUser(form, currentUser);
        setSuccessMessage("Usuario interno creado correctamente.");
      }

      resetForm();
    } catch (error) {
      console.error("Error saving internal user:", error);
      setErrorMessage(error.message || "No fue posible guardar el usuario interno.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (user) => {
    setUpdatingUserId(user.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await sendInternalUserResetEmail(user.email);
      setSuccessMessage("Se envió el correo de restablecimiento de contraseña.");
    } catch (error) {
      console.error("Error sending internal reset email:", error);
      setErrorMessage("No fue posible enviar el correo de restablecimiento.");
    } finally {
      setUpdatingUserId("");
    }
  };

  if (loading) {
    return <section className="card-base p-6">Cargando equipo interno...</section>;
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          Equipo y roles
        </p>
        <h2 className="section-title">Gestión de usuarios internos</h2>
        <p className="section-subtitle mt-2">
          Cree cuentas de administración y agentes de soporte, y controle su estado operativo.
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
        <article className="card-base p-6 xl:sticky xl:top-6">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            {editingUserId ? "Editar usuario interno" : "Nuevo usuario interno"}
          </h3>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="label-base">Nombre visible</label>
              <input
                name="name"
                className="input-base"
                value={form.name}
                onChange={handleChange}
                placeholder="Ejemplo: Laura Rodríguez"
              />
            </div>

            <div>
              <label className="label-base">Correo</label>
              <input
                name="email"
                type="email"
                className="input-base"
                value={form.email}
                onChange={handleChange}
                disabled={Boolean(editingUserId)}
                placeholder="usuario@empresa.com"
              />
              {editingUserId ? (
                <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                  El correo se conserva y no se modifica desde esta pantalla.
                </p>
              ) : null}
            </div>

            {!editingUserId ? (
              <div>
                <label className="label-base">Contraseña inicial</label>
                <input
                  name="password"
                  type="password"
                  className="input-base"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label-base">Rol</label>
                <select name="role" className="input-base" value={form.role} onChange={handleChange}>
                  <option value="agent">Agente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
                <span className="text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                  Acceso activo
                </span>
                <input
                  name="active"
                  type="checkbox"
                  checked={form.active}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 dark:border-[#555555] dark:bg-[#121212]"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Alcance operativo
              </p>
              <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
                {form.role === "admin"
                  ? "Acceso total al panel y a la administración de usuarios internos."
                  : "Acceso operativo a tickets, clientes, fichas, cotizaciones y catálogo sin acciones sensibles."}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {editingUserId ? (
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
              ) : null}
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Guardando..." : editingUserId ? "Guardar cambios" : "Crear usuario interno"}
              </button>
            </div>
          </form>
        </article>

        <div className="space-y-6">
          <article className="card-base p-5">
            <label className="label-base">Buscar por nombre, correo, rol o UID</label>
            <input
              className="input-base"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuario interno"
            />
          </article>

          <article className="card-base p-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">
              Equipo interno
            </h3>

            <div className="mt-5 grid gap-4">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">
                  No hay usuarios internos registrados todavía.
                </p>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.uid;

                  return (
                    <article
                      key={user.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#1A1A1A]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <h4 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">
                            {user.name || user.email || user.id}
                          </h4>
                          <p className="mt-1 text-sm text-slate-500 dark:text-[#B0B0B0]">
                            {user.email || "Sin correo"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusBadge text={getRoleLabel(user.role)} />
                            <StatusBadge text={user.active === false ? "Inactivo" : "Activo"} />
                            {isSelf ? <StatusBadge text="Tu cuenta" /> : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn-secondary px-4 py-2" onClick={() => handleEdit(user)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-secondary px-4 py-2"
                            onClick={() => handleResetPassword(user)}
                            disabled={updatingUserId === user.id}
                          >
                            {updatingUserId === user.id ? "Enviando..." : "Reset password"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <InfoRow label="UID" value={user.id} />
                        <InfoRow label="Creado" value={formatDateTime(user.createdAt)} />
                        <InfoRow label="Actualizado" value={formatDateTime(user.updatedAt)} />
                        <InfoRow label="Creado por" value={user.createdByName || user.createdByUid} />
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default AdminUsersPage;
