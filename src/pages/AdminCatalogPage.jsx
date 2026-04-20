/**
 * Admin catalog management page.
 */

import { useEffect, useMemo, useState } from "react";
import { CATALOG_TYPE_LABELS } from "../constants/catalog";
import {
  createCatalogItem,
  replaceServiceCatalogWithBase,
  subscribeServiceCatalog,
  updateCatalogItem,
} from "../services/catalogService";
import { useAuth } from "../hooks/useAuth";
import { canResetServiceCatalog } from "../utils/permissions";

const INITIAL_FORM = {
  type: "symptom",
  name: "",
  description: "",
  priceInformal: 0,
  priceFormal: 0,
  active: true,
  sortOrder: 0,
};

function ToggleSwitch({ checked, onChange, label = "Activo" }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
      <span className="text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
        {label}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() =>
          onChange({
            target: {
              name: "active",
              type: "checkbox",
              checked: !checked,
            },
          })
        }
        className={`relative inline-flex h-8 w-14 items-center rounded-full border transition-all duration-300 ${
          checked
            ? "border-slate-900 bg-slate-900 shadow-[0_0_0_3px_rgba(15,23,42,0.08)] dark:border-[#E0E0E0] dark:bg-[#E0E0E0] dark:shadow-[0_0_0_3px_rgba(224,224,224,0.08)]"
            : "border-slate-300 bg-slate-300 dark:border-[#555555] dark:bg-[#555555]"
        }`}
      >
        <span
          className={`absolute left-1 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-all duration-300 ${
            checked
              ? "translate-x-6 bg-white text-slate-900 dark:bg-[#121212] dark:text-[#E0E0E0]"
              : "translate-x-0 bg-white text-slate-400 dark:bg-[#121212] dark:text-[#888888]"
          }`}
        >
          {checked ? (
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4 10-10" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 8l8 8M16 8l-8 8" />
            </svg>
          )}
        </span>
      </button>
    </label>
  );
}

function AdminCatalogPage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const canSeedCatalog = canResetServiceCatalog(currentUser);

  useEffect(() => {
    const unsubscribe = subscribeServiceCatalog(
      (data) => {
        setItems(data);
        setLoading(false);
      },
      () => {
        setErrorMessage("No fue posible cargar el catálogo técnico.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const key = item.type || "other";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  const nextSortOrder = useMemo(() => {
    const sameTypeItems = items.filter((item) => item.type === form.type);
    const maxOrder = sameTypeItems.reduce(
      (acc, item) => Math.max(acc, Number(item.sortOrder ?? 0)),
      0
    );

    return maxOrder + 1;
  }, [items, form.type]);

  useEffect(() => {
    if (!editingId) {
      setForm((prev) => {
        if (prev.sortOrder === nextSortOrder) {
          return prev;
        }

        return {
          ...prev,
          sortOrder: nextSortOrder,
        };
      });
    }
  }, [nextSortOrder, editingId]);

  const resetForm = () => {
    setEditingId("");
    setForm({
      ...INITIAL_FORM,
      sortOrder: nextSortOrder,
    });
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSeedCatalog = async () => {
    if (!canSeedCatalog) {
      setErrorMessage("Solo un administrador puede restablecer el catálogo base.");
      return;
    }

    setSeeding(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await replaceServiceCatalogWithBase();
      setSuccessMessage("Catálogo base restablecido correctamente.");
      resetForm();
    } catch (error) {
      console.error("Error seeding catalog:", error);
      setErrorMessage("No fue posible restablecer el catálogo base.");
    } finally {
      setSeeding(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      type: item.type || "symptom",
      name: item.name || "",
      description: item.description || "",
      priceInformal: item.priceInformal ?? item.defaultPrice ?? 0,
      priceFormal: item.priceFormal ?? item.defaultPrice ?? 0,
      active: item.active !== false,
      sortOrder: item.sortOrder ?? 0,
    });
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!form.type.trim()) {
        throw new Error("El tipo es obligatorio.");
      }

      if (!form.name.trim()) {
        throw new Error("El nombre es obligatorio.");
      }

      const payload = {
        ...form,
        defaultPrice: Number(form.priceInformal ?? 0),
        sortOrder: editingId ? Number(form.sortOrder ?? 0) : nextSortOrder,
      };

      if (editingId) {
        await updateCatalogItem(editingId, payload);
        setSuccessMessage("Ítem actualizado correctamente.");
      } else {
        await createCatalogItem(payload);
        setSuccessMessage("Ítem creado correctamente.");
      }

      resetForm();
    } catch (error) {
      console.error("Error saving catalog item:", error);
      setErrorMessage(error.message || "No fue posible guardar el ítem.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            Catálogo técnico
          </p>
          <h2 className="section-title">Gestión de catálogo</h2>
          <p className="section-subtitle mt-2">
            Base reutilizable de síntomas, diagnósticos, procedimientos, materiales, recomendaciones y servicios.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="btn-secondary"
            onClick={resetForm}
            disabled={saving}
          >
            Nuevo ítem
          </button>
          {canSeedCatalog ? (
            <button
              type="button"
              className="btn-primary"
              onClick={handleSeedCatalog}
              disabled={seeding}
            >
              {seeding ? "Restableciendo..." : "Restablecer catálogo base"}
            </button>
          ) : null}
        </div>
      </header>

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </article>
      ) : null}

      {!canSeedCatalog ? (
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 transition-colors duration-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Como agente puede crear y editar ítems, pero no restablecer el catálogo base.
        </article>
      ) : null}

      {successMessage ? (
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 transition-colors duration-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {successMessage}
        </article>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)] xl:items-start">
        <article className="card-base p-6 xl:sticky xl:top-6">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            {editingId ? "Editar ítem" : "Nuevo ítem"}
          </h3>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="catalogType" className="label-base">
                Tipo
              </label>
              <select
                id="catalogType"
                name="type"
                className="input-base"
                value={form.type}
                onChange={handleChange}
              >
                {Object.entries(CATALOG_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="catalogName" className="label-base">
                Nombre
              </label>
              <input
                id="catalogName"
                name="name"
                type="text"
                className="input-base"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="catalogDescription" className="label-base">
                Descripción
              </label>
              <textarea
                id="catalogDescription"
                name="description"
                className="input-base min-h-[120px] resize-y"
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="catalogPriceInformal" className="label-base">
                  Precio informal
                </label>
                <input
                  id="catalogPriceInformal"
                  name="priceInformal"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-base"
                  value={form.priceInformal}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="catalogPriceFormal" className="label-base">
                  Precio formal
                </label>
                <input
                  id="catalogPriceFormal"
                  name="priceFormal"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-base"
                  value={form.priceFormal}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Precio base usado en cotizaciones
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                {Number(form.priceInformal || 0).toFixed(2)}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {editingId ? (
                <div>
                  <label htmlFor="catalogSortOrder" className="label-base">
                    Orden
                  </label>
                  <input
                    id="catalogSortOrder"
                    name="sortOrder"
                    type="number"
                    className="input-base"
                    value={form.sortOrder}
                    onChange={handleChange}
                  />
                </div>
              ) : (
                <div>
                  <label className="label-base">Orden automático</label>
                  <div className="input-base flex items-center text-slate-500 dark:text-[#B0B0B0]">
                    {nextSortOrder}
                  </div>
                </div>
              )}
            </div>

            {!editingId ? (
              <p className="text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                El orden se calcula automáticamente según los ítems existentes del mismo tipo.
              </p>
            ) : null}

            <ToggleSwitch checked={form.active} onChange={handleChange} />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar
              </button>

              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Guardando..." : editingId ? "Actualizar ítem" : "Crear ítem"}
              </button>
            </div>
          </form>
        </article>

        <div className="space-y-6 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto xl:pr-2">
          {loading ? (
            <article className="card-base p-6">
              <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
                Cargando catálogo...
              </p>
            </article>
          ) : null}

          {!loading && items.length === 0 ? (
            <article className="card-base p-8">
              <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                El catálogo está vacío
              </h3>
              <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
                Use el botón superior para restablecer el catálogo base.
              </p>
            </article>
          ) : null}

          {!loading &&
            items.length > 0 &&
            Object.entries(groupedItems).map(([type, entries]) => (
              <article key={type} className="card-base p-6">
                <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                  {CATALOG_TYPE_LABELS[type] || type}
                </h3>

                <div className="mt-4 grid gap-3">
                  {entries.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                            {item.name}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
                              {item.description}
                            </p>
                          ) : null}

                          <div className="mt-3 grid gap-2 text-xs text-slate-400 transition-colors duration-300 dark:text-[#888888] sm:grid-cols-3">
                            <span>Informal: {Number(item.priceInformal ?? 0).toFixed(2)}</span>
                            <span>Formal: {Number(item.priceFormal ?? 0).toFixed(2)}</span>
                            <span>Orden: {item.sortOrder ?? 0}</span>
                          </div>
                        </div>

                        <div>
                          <button
                            type="button"
                            className="btn-secondary px-3 py-2"
                            onClick={() => handleEdit(item)}
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}

export default AdminCatalogPage;