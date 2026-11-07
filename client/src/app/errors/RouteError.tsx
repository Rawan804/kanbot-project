import { isRouteErrorResponse, useRouteError, useNavigate } from 'react-router';
export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  let status = 500;
  let title = 'Something went wrong';
  let description = 'An unexpected error occurred. Try again or go back.';

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = 'Page not found';
      description = "The page you're looking for doesn't exist or may have moved.";
    } else if (error.status === 403) {
      title = 'Access denied';
      description = "You don't have permission to view this page.";
    }
  }

  const isNotFound = status === 404;

  return (
    <main className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center gap-3 bg-kanbot-background px-4 text-center">
      <p
        className="text-6xl font-bold tracking-tight text-slate-200"
        aria-hidden="true"
      >
        {status}
      </p>
      <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
      <p className="max-w-sm text-sm text-slate-500">{description}</p>
      <div className="mt-2 flex gap-2">
        {!isNotFound && (
          <button
            type="button"
            onClick={() => navigate(0)} // reload the current route
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary focus-visible:ring-offset-2"
          >
            Try again
          </button>
        )}
        <a
          href="/projects"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-kanbot-primary px-4 text-sm font-semibold text-white hover:bg-kanbot-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary focus-visible:ring-offset-2"
        >
          Back to projects
        </a>
      </div>
    </main>
  );
}
