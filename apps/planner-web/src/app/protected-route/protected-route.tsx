import { Navigate, Route, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/auth';

export interface ProtectedRouteProps {
  element: JSX.Element;
}

export function ProtectedRoute({ element }: ProtectedRouteProps) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return element;
}

export default ProtectedRoute;
