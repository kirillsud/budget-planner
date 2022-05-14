import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoginRouteState, selectAuthToken } from '@planner/auth-feature';

/* eslint-disable-next-line */
export interface ProtectedRouteProps {}

export function ProtectedRoute(props: ProtectedRouteProps) {
  const authToken = useSelector(selectAuthToken);
  const location = useLocation();

  if (!authToken) {
    const state: LoginRouteState = { from: location.pathname };
    return <Navigate to="/login" state={state} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
