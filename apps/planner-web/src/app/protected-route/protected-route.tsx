import { Navigate, Outlet, useLocation, Location } from 'react-router-dom';
import { useAuth } from '../utils/auth';

export interface RedirectRouteState {
  from: Location;
}

/* eslint-disable-next-line */
export interface ProtectedRouteProps {
}

export function ProtectedRoute(props: ProtectedRouteProps) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth) {
    return <Navigate to="/login" state={{ from: location } as RedirectRouteState} replace />;
  }

  return <Outlet/>;
}

export default ProtectedRoute;
