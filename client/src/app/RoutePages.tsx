import { lazy } from 'react';

export const LoginPage = lazy(() =>
  import('../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
export const RegisterPage = lazy(() =>
  import('../features/auth/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
export const ProjectsPage = lazy(() =>
  import('../features/projects/components/ProjectsPage').then((module) => ({ default: module.ProjectsPage })),
);
export const BacklogPage = lazy(() =>
  import('../features/backlog/components/BacklogPage').then((module) => ({ default: module.BacklogPage })),
);
export const BoardPage = lazy(() =>
  import('../features/board/components/BoardPage').then((module) => ({ default: module.BoardPage })),
);
export const SprintsPage = lazy(() =>
  import('../features/sprints/components/SprintsPage').then((module) => ({ default: module.SprintsPage })),
);
export const MyWeekPage = lazy(() =>
  import('../features/backlog/components/MyWeekPage').then((module) => ({ default: module.MyWeekPage })),
);
