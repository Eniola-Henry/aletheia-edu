import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center space-y-6">
      <p className="text-xs tracking-greek uppercase text-ink-faint">404</p>
      <h1 className="font-serif text-3xl text-ink">Page not found</h1>
      <p className="text-ink-soft text-sm">This path is not part of the story.</p>
      <Link
        href="/"
        className="inline-block px-6 py-3 rounded-full bg-ink text-cream text-sm font-medium hover:bg-ink-soft transition-colors"
      >
        Back home
      </Link>
    </div>
  );
}
