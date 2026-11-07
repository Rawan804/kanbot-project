import { Link } from 'react-router';

/** Top-level 404. Renders standalone (no AppShell) for truly unknown routes. */
export function NotFoundPage() {
  return (
    <main className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center gap-3 bg-kanbot-background px-4 text-center">
      <p className="text-6xl font-bold tracking-tight text-slate-300">404</p>
      <h1 className="text-xl font-semibold text-slate-800">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        to="/projects"
        className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-kanbot-primary px-4 text-sm font-semibold text-white hover:bg-kanbot-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary focus-visible:ring-offset-2"
      >
        Back to projects
      </Link>
    </main>
  );
}
