import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import 'lenis/dist/lenis.css';
import './index.css';
import { AuthBootstrap } from './features/auth/AuthBootstrap';
import { initAuth } from './features/auth/initAuth';
import { queryClient } from './app/query-client';
import { router } from './app/router';
import { SmoothScroll } from './app/providers/SmoothScroll';
import { MutationFeedback } from './app/providers/MutationFeedback';
import { ErrorBoundary } from './app/errors/ErrorBoundary';
import { OfflineStatusBanner } from './app/layouts/OfflineStatusBanner';
import { FullPageLoader } from './shared/components/FullPageLoader';

initAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OfflineStatusBanner />
        <MutationFeedback />
        <SmoothScroll />
        <AuthBootstrap>
          <Suspense fallback={<FullPageLoader />}>
            <RouterProvider router={router} />
          </Suspense>
        </AuthBootstrap>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
