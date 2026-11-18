import { Heart, MessageCircle } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Wordmark } from "../components/Wordmark";

/**
 * Living style guide at /design. Tokens come from src/index.css.
 * Edit a token there, then reload this page to see every component change.
 */
const swatches = [
  ["bg", "bg-bg"],
  ["card", "bg-card"],
  ["fg", "bg-fg"],
  ["muted", "bg-muted"],
  ["line", "bg-line"],
  ["accent", "bg-accent"],
  ["spark", "bg-spark"],
  ["danger", "bg-danger"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

export function DesignKit() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-medium">Design kit</h1>
      <p className="mb-6 text-sm text-muted">
        Draft neutrals; accent and spark are temporary. Use the moon icon to check dark mode.
      </p>

      <Section title="Wordmark (locked)">
        <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-4">
          <Wordmark className="text-6xl" />
          <Wordmark className="text-3xl" />
          <Wordmark className="text-xl" />
        </div>
      </Section>

      <Section title="Colour tokens">
        <ul className="grid grid-cols-4 gap-2">
          {swatches.map(([name, cls]) => (
            <li key={name} className="text-xs">
              <div className={`${cls} mb-1 h-12 rounded-lg border border-line`} />
              {name}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Post</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="danger">Delete</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Input">
        <label className="block text-sm font-medium" htmlFor="kit-email">
          College email
        </label>
        <input
          id="kit-email"
          type="email"
          placeholder="you@college.edu"
          className="mt-1 min-h-11 w-full rounded-lg border border-line bg-card px-3 text-base placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
        />
        <p className="mt-1 text-xs text-muted">Only verified college emails can join.</p>
      </Section>

      <Section title="Post card">
        <article className="rounded-card border border-line bg-card p-4">
          <header className="flex items-center gap-3">
            <Avatar name="Thoibi D" />
            <div>
              <p className="text-sm font-medium">Thoibi D.</p>
              <p className="text-xs text-muted">12m</p>
            </div>
          </header>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">
            Library second floor AC is finally fixed. No more excuses, go study.
          </p>
          <footer className="mt-3 flex items-center gap-5 text-sm text-muted">
            <button type="button" className="inline-flex min-h-11 items-center gap-1.5 text-spark">
              <Heart size={20} aria-hidden="true" /> 24
            </button>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle size={20} aria-hidden="true" /> 5
            </span>
          </footer>
        </article>
      </Section>
    </div>
  );
}
