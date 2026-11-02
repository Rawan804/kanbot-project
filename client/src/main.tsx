import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import 'lenis/dist/lenis.css';
import './index.css';
import { AuthBootstrap, initAuth } from './features/auth';
import { queryClient } from './lib/query-client';
import { SmoothScroll } from './lib/SmoothScroll';
import { router } from './router';

initAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SmoothScroll />
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
    </QueryClientProvider>
  </StrictMode>,
);
