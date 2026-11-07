import { useEffect, type ReactNode } from 'react';
import logo from '../../../../../assets/kanbot-icon.svg';
interface Props {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}
export function AuthLayout({
  title,
  subtitle,
  footer,
  children,
}: Props) {
  useEffect(() => {
    document.title = `${title} · Kanbot`;
  }, [title]);
  return (
    <main className="flex min-h-screen min-h-[100dvh] w-full items-center justify-center
      bg-kanbot-background px-3 py-6 dark:bg-kanbot-dark-background sm:px-4 sm:py-10">
      <div className="w-full max-w-[440px]">
        {/* Main Card */}
        <div className="overflow-hidden rounded-[22px] sm:rounded-[28px]
          bg-kanbot-surface dark:bg-kanbot-dark-surface
          border border-kanbot-border dark:border-kanbot-dark-border
          shadow-[0_16px_55px_rgba(35,52,110,0.09)] dark:shadow-[0_16px_55px_rgba(0,0,0,0.4)]">
          {/* Curved Header */}
          <div className="relative h-[140px] sm:h-[175px] bg-kanbot-primary-soft dark:bg-kanbot-dark-primary-soft">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -left-16 -top-20 h-48 w-48
                rounded-full bg-kanbot-primary-soft opacity-70 dark:bg-kanbot-dark-surface-elevated" />
              <div className="absolute -right-12 -top-24 h-52 w-52
                rounded-full bg-kanbot-primary-soft opacity-80 dark:bg-kanbot-dark-primary-soft" />
            </div>
            {/* Curved Bottom */}
            <svg
              className="absolute bottom-0 left-0 w-full h-[45px] sm:h-[65px]"
              viewBox="0 0 440 65"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M0 25 C110 75 320 75 440 25 L440 65 L0 65 Z"
                className="fill-kanbot-surface dark:fill-kanbot-dark-surface"
              />
            </svg>
            {/* Brand */}
            <div className="relative z-10 flex flex-col
              items-center pt-6 sm:pt-8">
              <img
                src={logo}
                alt="Kanbot logo"
                width={58}
                height={58}
                className="h-[48px] w-[48px] sm:h-[58px] sm:w-[58px]
                  rounded-[15px] sm:rounded-[18px]
                  shadow-lg shadow-kanbot-primary/25"
              />
              <span className="mt-2 text-lg font-bold
                tracking-tight text-kanbot-text dark:text-kanbot-dark-text sm:text-xl">
                Kanbot
              </span>
            </div>
          </div>
          {/* Form Content */}
          <div className="px-5 pb-7 pt-2 sm:px-10 sm:pb-9">
            <div className="mb-6 sm:mb-7 text-center">
              <h1 className="text-2xl font-bold
                tracking-tight text-kanbot-text dark:text-kanbot-dark-text sm:text-[26px]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed
                text-kanbot-muted dark:text-kanbot-dark-muted">
                {subtitle}
              </p>
            </div>
            <div className="w-full">
              {children}
            </div>
            <div className="mt-6 text-center text-sm
              text-kanbot-muted dark:text-kanbot-dark-muted sm:mt-7">
              {footer}
            </div>
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-kanbot-muted dark:text-kanbot-dark-muted sm:mt-6">
          &copy; {new Date().getFullYear()} Kanbot
        </p>
      </div>
    </main>
  );
}
