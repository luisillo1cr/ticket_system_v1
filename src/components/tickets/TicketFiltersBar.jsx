/**
 * Reusable ticket filters bar.
 */

import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "../../constants/tickets";

function TicketFiltersBar({
  filters,
  onChange,
  searchPlaceholder = "Buscar por ticket, asunto, sistema o cliente",
}) {
  return (
    <article className="card-base p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr]">
        <div>
          <label htmlFor="ticketSearch" className="label-base">
            Buscar
          </label>
          <input
            id="ticketSearch"
            name="search"
            type="text"
            className="input-base"
            placeholder={searchPlaceholder}
            value={filters.search}
            onChange={onChange}
          />
        </div>

        <div>
          <label htmlFor="ticketStatusFilter" className="label-base">
            Estado
          </label>
          <select
            id="ticketStatusFilter"
            name="status"
            className="input-base"
            value={filters.status}
            onChange={onChange}
          >
            <option value="all">Todos</option>
            {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ticketPriorityFilter" className="label-base">
            Prioridad
          </label>
          <select
            id="ticketPriorityFilter"
            name="priority"
            className="input-base"
            value={filters.priority}
            onChange={onChange}
          >
            <option value="all">Todas</option>
            {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ticketCategoryFilter" className="label-base">
            Categoría
          </label>
          <select
            id="ticketCategoryFilter"
            name="category"
            className="input-base"
            value={filters.category}
            onChange={onChange}
          >
            <option value="all">Todas</option>
            {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </article>
  );
}

export default TicketFiltersBar;