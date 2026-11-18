import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-xl font-medium">Nothing here</h1>
      <p className="mt-1 text-sm text-muted">This page doesn’t exist, or you can’t see it.</p>
      <Link to="/" className="mt-4 inline-block text-sm underline">
        Back to the feed
      </Link>
    </section>
  );
}
