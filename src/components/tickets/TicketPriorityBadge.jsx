/**
 * Ticket priority badge component.
 */

import { TICKET_PRIORITY_LABELS } from "../../constants/tickets";

const PRIORITY_STYLES = {
  low: "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-[#B0B0B0]",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function TicketPriorityBadge({ priority }) {
  const label = TICKET_PRIORITY_LABELS[priority] ?? "Sin prioridad";
  const classes = PRIORITY_STYLES[priority] ?? "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-[#B0B0B0]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-300 ${classes}`}
    >
      {label}
    </span>
  );
}

export default TicketPriorityBadge;