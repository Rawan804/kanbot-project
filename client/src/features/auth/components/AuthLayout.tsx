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
    <main className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center
      bg-[#f3f5fc] px-3 py-6 sm:px-4 sm:py-10">
      <div className="w-full max-w-[440px]">
        {/* Main Card */}
        <div className="overflow-hidden rounded-[22px] sm:rounded-[28px] bg-white
          border border-[#e9ecf5]
          shadow-[0_16px_55px_rgba(35,52,110,0.09)]">
          {/* Curved Header */}
          <div className="relative h-[140px] sm:h-[175px] bg-[#eef1ff]">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -left-16 h-48 w-48
                rounded-full bg-[#dce3ff] opacity-70" />
              <div className="absolute -top-24 -right-12 h-52 w-52
                rounded-full bg-[#e2e7ff] opacity-80" />
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
                fill="white"
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
                  shadow-lg shadow-[#4F46E5]/25"
              />
              <span className="mt-2 text-lg sm:text-xl font-bold
                tracking-tight text-[#253052]">
                Kanbot
              </span>
            </div>
          </div>
          {/* Form Content */}
          <div className="px-5 pb-7 pt-2 sm:px-10 sm:pb-9">
            <div className="mb-6 sm:mb-7 text-center">
              <h1 className="text-2xl sm:text-[26px] font-bold
                tracking-tight text-[#202945]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed
                text-[#8991a7]">
                {subtitle}
              </p>
            </div>
            <div className="w-full">
              {children}
            </div>
            <div className="mt-6 sm:mt-7 text-center text-sm
              text-[#858da3]">
              {footer}
            </div>
          </div>
        </div>
        <p className="mt-5 sm:mt-6 text-center text-xs text-[#a1a8ba]">
          © {new Date().getFullYear()} Kanbot
        </p>
      </div>
    </main>
  );
}
