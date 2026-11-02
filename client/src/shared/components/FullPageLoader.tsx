
export function FullPageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen min-h-[100dvh] w-full flex-col
        items-center justify-center gap-3
        bg-[#f5f6fa] dark:bg-[#0b1020]"
    >
      <svg
        className="h-8 w-8 animate-spin text-[#2f4bff]"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Loading Kanbot…
      </span>
    </div>
  );
}
