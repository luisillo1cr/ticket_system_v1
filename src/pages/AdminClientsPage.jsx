/**
 * Admin clients management page.
 */

import { useEffect, useMemo, useState } from "react";
import {
  createClient,
  createClientAccessUser,
  createSystem,
  deleteClientCascade,
  deleteSystem,
  sendClientAccessResetEmail,
  subscribeClientAccessUsers,
  subscribeClients,
  subscribeSystems,
  updateClient,
  updateClientAccessUser,
  updateSystem,
} from "../services/clientService";
import { useAuth } from "../hooks/useAuth";
import { canDeleteClients, canDeleteSystems, canManageClientAccess } from "../utils/permissions";

const CLIENT_STATUS_LABELS = {
  active: "Activo",
  paused: "Pausado",
  prospect: "Prospecto",
  inactive: "Inactivo",
};

const CLIENT_PRIORITY_LABELS = {
  normal: "Normal",
  high: "Alta",
  critical: "Crítica",
};

const SYSTEM_STATUS_LABELS = {
  active: "Activo",
  maintenance: "Mantenimiento",
  paused: "Pausado",
  archived: "Archivado",
};


const CLIENT_PHONE_TYPE_LABELS = {
  national: "Nacional (CR)",
  international: "Internacional",
};

const CLIENT_ID_TYPE_LABELS = {
  national: "Cédula nacional",
  foreign: "Identificación extranjera",
  legal: "Cédula jurídica",
};

function formatNationalPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)} ${digits.slice(4)}`.trim();
}

function formatInternationalPhone(value) {
  const normalized = String(value || "")
    .replace(/[^\d+\s()-]/g, "")
    .replace(/(?!^)\+/g, "")
    .slice(0, 24);
  return normalized.trimStart();
}

function formatNationalId(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 1) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`;
}

function formatLegalId(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 1) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
  return `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4)}`;
}

function formatForeignId(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 24);
}

function formatPhoneByType(value, phoneType) {
  return phoneType === "international"
    ? formatInternationalPhone(value)
    : formatNationalPhone(value);
}

function formatIdByType(value, idType) {
  if (idType === "legal") return formatLegalId(value);
  if (idType === "foreign") return formatForeignId(value);
  return formatNationalId(value);
}

const SYSTEM_TYPE_OPTIONS = [
  "Sistema web",
  "Landing page",
  "Portal de soporte",
  "Reservas",
  "Expediente dental",
  "E-commerce",
  "App administrativa",
  "Sitio informativo",
  "Otro",
];

function createEmptyClientForm() {
  return {
    clientId: "",
    name: "",
    company: "",
    email: "",
    phoneType: "national",
    phone: "",
    contactPerson: "",
    idType: "national",
    idNumber: "",
    status: "active",
    supportPriority: "normal",
    notes: "",
  };
}

function createEmptySystemForm(selectedClientId = "") {
  return {
    clientId: selectedClientId,
    name: "",
    type: "Sistema web",
    status: "active",
    accessUrl: "",
    notes: "",
  };
}

function createEmptyAccessForm(selectedClientId = "") {
  return {
    clientId: selectedClientId,
    name: "",
    email: "",
    password: "",
  };
}

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

function AdminClientsPage() {
  const { currentUser } = useAuth();
  const canDeleteClientRecords = canDeleteClients(currentUser);
  const canDeleteClientSystems = canDeleteSystems(currentUser);
  const canManageAccess = canManageClientAccess(currentUser);
  const [clients, setClients] = useState([]);
  const [systems, setSystems] = useState([]);
  const [accessUsers, setAccessUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClientId, setSelectedClientId] = useState("");

  const [clientForm, setClientForm] = useState(createEmptyClientForm());
  const [editingClientId, setEditingClientId] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  const [systemForm, setSystemForm] = useState(createEmptySystemForm());
  const [editingSystemId, setEditingSystemId] = useState("");
  const [savingSystem, setSavingSystem] = useState(false);

  const [accessForm, setAccessForm] = useState(createEmptyAccessForm());
  const [savingAccess, setSavingAccess] = useState(false);
  const [updatingAccessId, setUpdatingAccessId] = useState("");
  const [deletingClientId, setDeletingClientId] = useState("");

  useEffect(() => {
    const unsubscribeClients = subscribeClients(
      (data) => {
        setClients(data);
        setLoading(false);
      },
      () => {
        setErrorMessage("No fue posible cargar los clientes.");
        setLoading(false);
      }
    );

    const unsubscribeSystems = subscribeSystems(
      (data) => setSystems(data),
      () => setErrorMessage("No fue posible cargar los sistemas.")
    );

    return () => {
      unsubscribeClients();
      unsubscribeSystems();
    };
  }, []);

  useEffect(() => {
    if (!canManageAccess || !selectedClientId) {
      setAccessUsers([]);
      return () => {};
    }

    const unsubscribe = subscribeClientAccessUsers(
      selectedClientId,
      (data) => setAccessUsers(data),
      () => setErrorMessage("No fue posible cargar los accesos del cliente.")
    );

    return () => unsubscribe();
  }, [canManageAccess, selectedClientId]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !term ||
        [client.id, client.name, client.company, client.email, client.phone, client.contactPerson, client.idNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || String(client.status || "active") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  useEffect(() => {
    if (!selectedClientId && filteredClients.length) {
      setSelectedClientId(filteredClients[0].id);
      return;
    }

    if (selectedClientId && !clients.some((item) => item.id === selectedClientId)) {
      setSelectedClientId(filteredClients[0]?.id || "");
    }
  }, [clients, filteredClients, selectedClientId]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const selectedClientSystems = useMemo(
    () => systems.filter((system) => system.clientId === selectedClientId),
    [systems, selectedClientId]
  );

  const systemsCountByClientId = useMemo(() => {
    return systems.reduce((acc, system) => {
      const clientId = String(system.clientId || "");
      acc[clientId] = (acc[clientId] || 0) + 1;
      return acc;
    }, {});
  }, [systems]);

  useEffect(() => {
    setSystemForm((prev) => ({ ...prev, clientId: selectedClientId || prev.clientId }));
    setAccessForm((prev) => ({ ...prev, clientId: selectedClientId || prev.clientId }));
  }, [selectedClientId]);

  const resetClientForm = () => {
    setEditingClientId("");
    setClientForm(createEmptyClientForm());
  };

  const resetSystemForm = () => {
    setEditingSystemId("");
    setSystemForm(createEmptySystemForm(selectedClientId));
  };

  const resetAccessForm = () => {
    setAccessForm(createEmptyAccessForm(selectedClientId));
  };

  const handleClientChange = (event) => {
    const { name, value } = event.target;

    setClientForm((prev) => {
      if (name === "phoneType") {
        return {
          ...prev,
          phoneType: value,
          phone: formatPhoneByType(prev.phone, value),
        };
      }

      if (name === "idType") {
        return {
          ...prev,
          idType: value,
          idNumber: formatIdByType(prev.idNumber, value),
        };
      }

      if (name === "phone") {
        return {
          ...prev,
          phone: formatPhoneByType(value, prev.phoneType),
        };
      }

      if (name === "idNumber") {
        return {
          ...prev,
          idNumber: formatIdByType(value, prev.idType),
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSystemChange = (event) => {
    const { name, value } = event.target;
    setSystemForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccessChange = (event) => {
    const { name, value } = event.target;
    setAccessForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClient = (client) => {
    setSelectedClientId(client.id);
    setEditingClientId(client.id);
    setClientForm({
      clientId: client.id,
      name: client.name || "",
      company: client.company || "",
      email: client.email || "",
      phoneType: client.phoneType || "national",
      phone: client.phone || "",
      contactPerson: client.contactPerson || "",
      idType: client.idType || "national",
      idNumber: client.idNumber || "",
      status: client.status || "active",
      supportPriority: client.supportPriority || "normal",
      notes: client.notes || "",
    });
  };

  const handleEditSystem = (system) => {
    setSelectedClientId(system.clientId);
    setEditingSystemId(system.id);
    setSystemForm({
      clientId: system.clientId || "",
      name: system.name || "",
      type: system.type || "Sistema web",
      status: system.status || "active",
      accessUrl: system.accessUrl || "",
      notes: system.notes || "",
    });
  };

  const handleSaveClient = async (event) => {
    event.preventDefault();
    setSavingClient(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (editingClientId) {
        await updateClient(editingClientId, clientForm);
        setSuccessMessage("Cliente actualizado correctamente.");
      } else {
        const created = await createClient(clientForm);
        setSelectedClientId(created.id);
        setSuccessMessage("Cliente creado correctamente.");
      }
      resetClientForm();
    } catch (error) {
      console.error("Error saving client:", error);
      setErrorMessage(error.message || "No fue posible guardar el cliente.");
    } finally {
      setSavingClient(false);
    }
  };

  const handleSaveSystem = async (event) => {
    event.preventDefault();
    setSavingSystem(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (editingSystemId) {
        await updateSystem(editingSystemId, systemForm);
        setSuccessMessage("Sistema actualizado correctamente.");
      } else {
        await createSystem(systemForm);
        setSuccessMessage("Sistema agregado correctamente.");
      }
      resetSystemForm();
    } catch (error) {
      console.error("Error saving system:", error);
      setErrorMessage(error.message || "No fue posible guardar el sistema.");
    } finally {
      setSavingSystem(false);
    }
  };

  const handleSaveAccess = async (event) => {
    event.preventDefault();

    if (!canManageAccess) {
      setErrorMessage("Solo un administrador puede crear accesos de cliente.");
      return;
    }
    setSavingAccess(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createClientAccessUser(accessForm, currentUser);
      setSuccessMessage("Acceso del cliente creado correctamente.");
      resetAccessForm();
    } catch (error) {
      console.error("Error creating client access:", error);
      setErrorMessage(error.message || "No fue posible crear el acceso del cliente.");
    } finally {
      setSavingAccess(false);
    }
  };

  const handleToggleAccess = async (user) => {
    if (!canManageAccess) {
      setErrorMessage("Solo un administrador puede activar o desactivar accesos.");
      return;
    }

    setUpdatingAccessId(user.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateClientAccessUser(user.id, {
        name: user.name,
        active: !user.active,
      });
      setSuccessMessage("Estado del acceso actualizado correctamente.");
    } catch (error) {
      console.error("Error updating client access:", error);
      setErrorMessage("No fue posible actualizar el acceso del cliente.");
    } finally {
      setUpdatingAccessId("");
    }
  };

  const handleResetAccess = async (user) => {
    if (!canManageAccess) {
      setErrorMessage("Solo un administrador puede restablecer contraseñas.");
      return;
    }

    setUpdatingAccessId(user.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await sendClientAccessResetEmail(user.email);
      setSuccessMessage("Se envió el correo de restablecimiento de contraseña.");
    } catch (error) {
      console.error("Error sending reset email:", error);
      setErrorMessage("No fue posible enviar el correo de restablecimiento.");
    } finally {
      setUpdatingAccessId("");
    }
  };

  const handleDeleteSystem = async (systemId) => {
    if (!canDeleteClientSystems) {
      setErrorMessage("Solo un administrador puede eliminar sistemas.");
      return;
    }

    setDeletingClientId(systemId);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await deleteSystem(systemId);
      setSuccessMessage("Sistema eliminado correctamente.");
      if (editingSystemId === systemId) resetSystemForm();
    } catch (error) {
      console.error("Error deleting system:", error);
      setErrorMessage("No fue posible eliminar el sistema.");
    } finally {
      setDeletingClientId("");
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!canDeleteClientRecords) {
      setErrorMessage("Solo un administrador puede eliminar clientes.");
      return;
    }

    setDeletingClientId(clientId);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await deleteClientCascade(clientId);
      setSuccessMessage("Cliente eliminado correctamente.");
      if (editingClientId === clientId) resetClientForm();
    } catch (error) {
      console.error("Error deleting client:", error);
      setErrorMessage("No fue posible eliminar el cliente.");
    } finally {
      setDeletingClientId("");
    }
  };

  if (loading) {
    return <section className="card-base p-6">Cargando clientes...</section>;
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          Clientes
        </p>
        <h2 className="section-title">Gestión de clientes y accesos</h2>
        <p className="section-subtitle mt-2">
          Administre clientes, sistemas activos y accesos. Los agentes pueden operar el módulo sin ejecutar acciones sensibles.
        </p>
      </header>

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{errorMessage}</div> : null}
      {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">{successMessage}</div> : null}

      <article className="card-base p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_240px]">
          <div>
            <label className="label-base">Buscar cliente</label>
            <input className="input-base" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, empresa, email, teléfono o ID" />
          </div>
          <div>
            <label className="label-base">Estado</label>
            <select className="input-base" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos</option>
              {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
        <div className="xl:sticky xl:top-6">
          <article className="card-base p-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">{editingClientId ? "Editar cliente" : "Nuevo cliente"}</h3>
            <form className="mt-5 space-y-4" onSubmit={handleSaveClient}>
              <div>
                <label className="label-base">ID interno del cliente</label>
                <input name="clientId" className="input-base" value={clientForm.clientId} onChange={handleClientChange} disabled={Boolean(editingClientId)} placeholder="Ejemplo: client_bocaraca" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div><label className="label-base">Nombre visible</label><input name="name" className="input-base" value={clientForm.name} onChange={handleClientChange} /></div>
                <div><label className="label-base">Empresa / negocio</label><input name="company" className="input-base" value={clientForm.company} onChange={handleClientChange} /></div>
                <div><label className="label-base">Correo</label><input name="email" type="email" className="input-base" value={clientForm.email} onChange={handleClientChange} /></div>
                <div>
                  <label className="label-base">Teléfono</label>
                  <div className="grid gap-3">
                    <select name="phoneType" className="input-base" value={clientForm.phoneType} onChange={handleClientChange}>
                      {Object.entries(CLIENT_PHONE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <input name="phone" className="input-base" value={clientForm.phone} onChange={handleClientChange} placeholder={clientForm.phoneType === "international" ? "+506 8888 9999" : "8888 9999"} />
                  </div>
                </div>
                <div><label className="label-base">Contacto principal</label><input name="contactPerson" className="input-base" value={clientForm.contactPerson} onChange={handleClientChange} /></div>
                <div>
                  <label className="label-base">Cédula / ID</label>
                  <div className="grid gap-3">
                    <select name="idType" className="input-base" value={clientForm.idType} onChange={handleClientChange}>
                      {Object.entries(CLIENT_ID_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <input name="idNumber" className="input-base" value={clientForm.idNumber} onChange={handleClientChange} placeholder={clientForm.idType === "legal" ? "3-101-123456" : clientForm.idType === "foreign" ? "DIMEX / PASAPORTE" : "1-2345-6789"} />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div><label className="label-base">Estado</label><select name="status" className="input-base" value={clientForm.status} onChange={handleClientChange}>{Object.entries(CLIENT_STATUS_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div><label className="label-base">Prioridad de soporte</label><select name="supportPriority" className="input-base" value={clientForm.supportPriority} onChange={handleClientChange}>{Object.entries(CLIENT_PRIORITY_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              </div>
              <div><label className="label-base">Notas</label><textarea name="notes" className="input-base min-h-[120px] resize-y" value={clientForm.notes} onChange={handleClientChange} /></div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {editingClientId ? <button type="button" className="btn-secondary" onClick={resetClientForm}>Cancelar</button> : null}
                <button type="submit" className="btn-primary" disabled={savingClient}>{savingClient ? "Guardando..." : editingClientId ? "Guardar cambios" : "Crear cliente"}</button>
              </div>
            </form>
          </article>
        </div>

        <div className="space-y-6 xl:max-h-[calc(100vh-160px)] xl:overflow-y-auto xl:pr-1">
          <article className="card-base p-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">Clientes registrados</h3>
            <div className="mt-5 grid gap-4">
              {filteredClients.map((client) => (
                <article key={client.id} className={`rounded-2xl border p-4 transition-colors duration-300 ${selectedClientId === client.id ? "border-slate-900 bg-slate-50 dark:border-[#E0E0E0] dark:bg-[#181818]" : "border-slate-200 bg-white dark:border-[#444444] dark:bg-[#1A1A1A]"}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 cursor-pointer" onClick={() => setSelectedClientId(client.id)}>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">{client.name || client.company || client.id}</h4>
                      <p className="mt-1 text-sm text-slate-500 dark:text-[#B0B0B0]">{client.company || client.name || client.id}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge text={CLIENT_STATUS_LABELS[client.status] || client.status || "Activo"} />
                        <StatusBadge text={`${systemsCountByClientId[client.id] || 0} sistema(s)`} />
                        <StatusBadge text={`Prioridad ${CLIENT_PRIORITY_LABELS[client.supportPriority] || client.supportPriority || "Normal"}`} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary px-4 py-2" onClick={() => handleEditClient(client)}>Editar</button>
                      {canDeleteClientRecords ? <button type="button" className="btn-secondary px-4 py-2" onClick={() => handleDeleteClient(client.id)} disabled={deletingClientId === client.id}>{deletingClientId === client.id ? "Eliminando..." : "Eliminar"}</button> : null}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InfoRow label="ID interno" value={client.id} />
                    <InfoRow label="Correo" value={client.email} />
                    <InfoRow label="Identificación" value={client.idNumber ? `${CLIENT_ID_TYPE_LABELS[client.idType || "national"]}: ${client.idNumber}` : "No definido"} />
                    <InfoRow label="Teléfono" value={client.phone ? `${CLIENT_PHONE_TYPE_LABELS[client.phoneType || "national"]}: ${client.phone}` : "No definido"} />
                    <InfoRow label="Actualizado" value={formatDateTime(client.updatedAt)} />
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="card-base p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">Sistemas asociados</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-[#B0B0B0]">{selectedClient ? `Sistemas activos del cliente ${selectedClient.id}` : "Seleccione un cliente."}</p>
              </div>
              {selectedClient ? <StatusBadge text={`Cliente: ${selectedClient.id}`} /> : null}
            </div>
            <form className="mt-5 space-y-4" onSubmit={handleSaveSystem}>
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                <div className="md:col-span-2"><label className="label-base">Nombre del sistema</label><input name="name" className="input-base" value={systemForm.name} onChange={handleSystemChange} placeholder="Ejemplo: portal de reservas" /></div>
                <div><label className="label-base">Tipo</label><select name="type" className="input-base" value={systemForm.type} onChange={handleSystemChange}>{SYSTEM_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                <div><label className="label-base">Estado</label><select name="status" className="input-base" value={systemForm.status} onChange={handleSystemChange}>{Object.entries(SYSTEM_STATUS_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div className="md:col-span-2 xl:col-span-3"><label className="label-base">URL / acceso</label><input name="accessUrl" className="input-base" value={systemForm.accessUrl} onChange={handleSystemChange} placeholder="https://..." /></div>
              </div>
              <div><label className="label-base">Notas del sistema</label><textarea name="notes" className="input-base min-h-[100px] resize-y" value={systemForm.notes} onChange={handleSystemChange} /></div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{editingSystemId ? <button type="button" className="btn-secondary" onClick={resetSystemForm}>Cancelar</button> : null}<button type="submit" className="btn-primary" disabled={savingSystem || !selectedClientId}>{savingSystem ? "Guardando..." : editingSystemId ? "Guardar sistema" : "Agregar sistema"}</button></div>
            </form>
            <div className="mt-5 grid gap-4">
              {selectedClientSystems.map((system) => (
                <article key={system.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#444444] dark:bg-[#1A1A1A]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">{system.name}</h4>
                      <p className="mt-1 text-sm text-slate-500 dark:text-[#B0B0B0]">{system.type}</p>
                      <div className="mt-3 flex flex-wrap gap-2"><StatusBadge text={SYSTEM_STATUS_LABELS[system.status] || system.status || "Activo"} /></div>
                    </div>
                    <div className="flex gap-2"><button type="button" className="btn-secondary px-4 py-2" onClick={() => handleEditSystem(system)}>Editar</button>{canDeleteClientSystems ? <button type="button" className="btn-secondary px-4 py-2" onClick={() => handleDeleteSystem(system.id)} disabled={deletingClientId === system.id}>{deletingClientId === system.id ? "Eliminando..." : "Eliminar"}</button> : null}</div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><InfoRow label="ID sistema" value={system.id} /><InfoRow label="URL" value={system.accessUrl} /><InfoRow label="Cliente" value={system.clientId} /><InfoRow label="Actualizado" value={formatDateTime(system.updatedAt)} /></div>
                </article>
              ))}
            </div>
          </article>

          <article className="card-base p-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">Acceso real del cliente</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-[#B0B0B0]">Cree usuarios del portal asociados al cliente seleccionado y active o desactive su acceso.</p>
            </div>

            {canManageAccess ? (
              <>
                <form className="mt-5 space-y-4" onSubmit={handleSaveAccess}>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div><label className="label-base">Nombre del usuario</label><input name="name" className="input-base" value={accessForm.name} onChange={handleAccessChange} /></div>
                    <div><label className="label-base">Correo de acceso</label><input name="email" type="email" className="input-base" value={accessForm.email} onChange={handleAccessChange} /></div>
                    <div><label className="label-base">Contraseña inicial</label><input name="password" type="password" className="input-base" value={accessForm.password} onChange={handleAccessChange} /></div>
                  </div>
                  <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={savingAccess || !selectedClientId}>{savingAccess ? "Creando acceso..." : "Crear acceso cliente"}</button></div>
                </form>
                <div className="mt-5 grid gap-4">
                  {accessUsers.length === 0 ? <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">Este cliente aún no tiene accesos creados.</p> : accessUsers.map((user) => (
                    <article key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#444444] dark:bg-[#1A1A1A]">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">{user.name || user.email || user.id}</h4>
                          <p className="mt-1 text-sm text-slate-500 dark:text-[#B0B0B0]">{user.email || "Sin correo"}</p>
                          <div className="mt-3 flex flex-wrap gap-2"><StatusBadge text={user.active === false ? "Acceso desactivado" : "Acceso activo"} /></div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn-secondary px-4 py-2" onClick={() => handleToggleAccess(user)} disabled={updatingAccessId === user.id}>{updatingAccessId === user.id ? "Guardando..." : user.active === false ? "Activar acceso" : "Desactivar acceso"}</button>
                          <button type="button" className="btn-secondary px-4 py-2" onClick={() => handleResetAccess(user)} disabled={updatingAccessId === user.id}>Reset password</button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><InfoRow label="UID" value={user.id} /><InfoRow label="Cliente" value={user.clientId} /><InfoRow label="Activo" value={user.active === false ? "No" : "Sí"} /><InfoRow label="Actualizado" value={formatDateTime(user.updatedAt)} /></div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                El rol agente puede administrar clientes y sistemas, pero no crear accesos, activar cuentas ni restablecer contraseñas.
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

export default AdminClientsPage;
