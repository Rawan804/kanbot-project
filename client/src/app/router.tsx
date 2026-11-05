import { createBrowserRouter, Navigate } from 'react-router';
import { GuestRoute, LoginPage, ProtectedRoute, RegisterPage } from '../features/auth';
import { AppShell } from './layouts/AppShell';
import { RouteError } from './errors/RouteError';
import { NotFoundPage } from './errors/NotFoundPage';
import { ProjectsPage } from '../features/projects';
import { ProjectRedirect } from '../features/projects/components/ProjectRedirect';
import { BacklogPage } from '../features/backlog/components/BacklogPage';
import { BoardPage } from '../features/board/components/BoardPage';
import { SprintsPage } from '../features/sprints/components/SprintsPage';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        errorElement: <RouteError />,
        children: [
          { path: '/', element: <Navigate to="/projects" replace /> },
          { path: '/projects', element: <ProjectsPage /> },
          { path: '/projects/:projectId', element: <ProjectRedirect /> },
          { path: '/projects/:projectId/backlog', element: <BacklogPage /> },
          { path: '/projects/:projectId/board', element: <BoardPage /> },
          { path: '/projects/:projectId/sprints', element: <SprintsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
