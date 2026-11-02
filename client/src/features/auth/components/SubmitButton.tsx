import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
}

export function SubmitButton({ loading, loadingText, children, disabled, className = '', ...rest }: Props) {
  const isBusy = Boolean(loading);

  return (
    <button
      type="submit"
      disabled={disabled || isBusy}
      aria-busy={isBusy}
      className={`w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#2f4bff] hover:bg-[#253ecc] active:bg-[#1f35b2] text-white font-semibold py-2.5 px-4 text-base sm:text-sm shadow-sm hover:shadow transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131a30] ${className}`}
      {...rest}
    >
      {isBusy && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span>{isBusy && loadingText ? loadingText : children}</span>
    </button>
  );
}
