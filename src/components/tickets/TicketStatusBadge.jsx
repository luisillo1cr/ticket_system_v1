/**
 * Ticket status badge component.
 */

import { TICKET_STATUS_LABELS } from "../../constants/tickets";

const STATUS_STYLES = {
  open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  in_review: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  waiting_client: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  resolved: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  closed_resolved: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-[#B0B0B0]",
};

function TicketStatusBadge({ status }) {
  const label = TICKET_STATUS_LABELS[status] ?? "Sin estado";
  const classes = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-[#B0B0B0]";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-300 ${classes}`}>
      {label}
    </span>
  );
}

export default TicketStatusBadge;
