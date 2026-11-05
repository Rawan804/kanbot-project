import { Navigate, useParams } from 'react-router';
export function ProjectRedirect() {
  const { projectId } = useParams();
  return <Navigate to={`/projects/${projectId ?? ''}/backlog`} replace />;
}
