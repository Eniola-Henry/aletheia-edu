import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-faint">
        <p className="tracking-greek uppercase">Aletheia.edu · learn through story</p>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <Link href="/dashboard" className="hover:text-ink transition-colors">
            Courses
          </Link>
          <Link href="/login" className="hover:text-ink transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
