/**
 * Protected route guard.
 */

import { Navigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../hooks/useAuth";
import LoadingScreen from "./LoadingScreen";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { loading, isAuthenticated, currentUser } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!currentUser?.profileExists || !currentUser?.role || currentUser?.active === false) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return children;
}

export default ProtectedRoute;
