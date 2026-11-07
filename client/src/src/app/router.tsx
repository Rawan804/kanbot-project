import { createBrowserRouter, Navigate } from 'react-router';
import { GuestRoute } from '../features/auth/GuestRoute';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AppShell } from './layouts/AppShell';
import { RouteError } from './errors/RouteError';
import { NotFoundPage } from './errors/NotFoundPage';
import { ProjectRedirect } from '../features/projects/components/ProjectRedirect';
import {
  BacklogPage,
  BoardPage,
  LoginPage,
  MyWeekPage,
  ProjectsPage,
  RegisterPage,
  SprintsPage,
} from './RoutePages';

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
          { path: '/projects/:projectId/week', element: <MyWeekPage /> },
          { path: '/projects/:projectId/board', element: <BoardPage /> },
          { path: '/projects/:projectId/sprints', element: <SprintsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
