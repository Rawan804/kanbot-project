import { createBrowserRouter, Navigate } from 'react-router';
import { GuestRoute, LoginPage, ProtectedRoute, RegisterPage, useAuthStore } from './features/auth';
import { useLogout } from './features/auth/hooks/useLogout';

// Temporary page so you can test the full auth flow before Day 2.
function ProjectsPlaceholder() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  return (
    <div style={{ padding: 32 }}>
      <p>Signed in as {user?.name}</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />, // later: AppShell layout goes here
    children: [
      { path: '/', element: <Navigate to="/projects" replace /> },
      { path: '/projects', element: <ProjectsPlaceholder /> },
    ],
  },
  { path: '*', element: <p style={{ padding: 32 }}>Page not found.</p> },
]);
