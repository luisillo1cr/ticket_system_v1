/**
 * Guest-only route guard.
 *
 * Redirects authenticated users away from public auth pages.
 */

import { Navigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../hooks/useAuth";
import LoadingScreen from "./LoadingScreen";

function GuestRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.APP} replace />;
  }

  return children;
}

export default GuestRoute;