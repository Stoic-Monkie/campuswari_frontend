import { useSearchParams } from "react-router-dom";
import { isAdmin } from "../me/roles";
import { useMe } from "../me/useMe";
import { HiddenView } from "./HiddenView";
import { PeopleView } from "./PeopleView";
import { ReportsView } from "./ReportsView";

type View = "reports" | "hidden" | "people";

/** Moderation home: the report queue, everything that was hidden, and (admins) accounts. */
export function AdminPage() {
  const me = useMe().data;
  const admin = isAdmin(me);
  const [params, setParams] = useSearchParams();

  const requested = params.get("view");
  // Moderators never get the people view, even by typing the address.
  const view: View = requested === "hidden" ? "hidden" : requested === "people" && admin ? "people" : "reports";

  const sections: { value: View; label: string }[] = [
    { value: "reports", label: "Reports" },
    { value: "hidden", label: "Hidden" },
    ...(admin ? [{ value: "people" as const, label: "People" }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Moderation</h1>

      <nav aria-label="Moderation sections" className="flex gap-1 border-b border-line">
        {sections.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-current={s.value === view ? "page" : undefined}
            onClick={() => setParams(s.value === "reports" ? {} : { view: s.value })}
            className={`min-h-11 border-b-2 px-4 text-sm font-medium ${
              s.value === view ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {view === "reports" ? <ReportsView isAdmin={admin} /> : null}
      {view === "hidden" ? <HiddenView isAdmin={admin} /> : null}
      {view === "people" ? <PeopleView /> : null}
    </div>
  );
}
