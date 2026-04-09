/**
 * Main application router.
 */

import { Navigate, Route, Routes } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import GuestRoute from "../../components/shared/GuestRoute";
import ProtectedRoute from "../../components/shared/ProtectedRoute";
import LoginPage from "../../pages/LoginPage";
import AdminDashboardPage from "../../pages/AdminDashboardPage";
import ClientDashboardPage from "../../pages/ClientDashboardPage";
import ClientProfilePage from "../../pages/ClientProfilePage";
import UnauthorizedPage from "../../pages/UnauthorizedPage";
import NotFoundPage from "../../pages/NotFoundPage";
import AdminTicketsPage from "../../pages/AdminTicketsPage";
import AdminTicketDetailPage from "../../pages/AdminTicketDetailPage";
import AdminCreateTicketPage from "../../pages/AdminCreateTicketPage";
import ClientTicketsPage from "../../pages/ClientTicketsPage";
import ClientTicketDetailPage from "../../pages/ClientTicketDetailPage";
import ClientCreateTicketPage from "../../pages/ClientCreateTicketPage";
import AdminTechnicalReportsPage from "../../pages/AdminTechnicalReportsPage";
import AdminCreateTechnicalReportPage from "../../pages/AdminCreateTechnicalReportPage";
import AdminTechnicalReportDetailPage from "../../pages/AdminTechnicalReportDetailPage";
import AdminCatalogPage from "../../pages/AdminCatalogPage";
import AdminQuotesPage from "../../pages/AdminQuotesPage";
import AdminCreateQuotePage from "../../pages/AdminCreateQuotePage";
import AdminQuoteDetailPage from "../../pages/AdminQuoteDetailPage";
import AdminClientsPage from "../../pages/AdminClientsPage";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../hooks/useAuth";
import LoadingScreen from "../../components/shared/LoadingScreen";

function AppIndexRedirect() {
  const { loading, currentUser } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (currentUser?.role === "admin") {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  if (currentUser?.role === "client") {
    return <Navigate to={ROUTES.CLIENT_DASHBOARD} replace />;
  }

  return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
}

function AppShell() {
  return (
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  );
}

function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.APP} replace />} />

      <Route
        path={ROUTES.LOGIN}
        element={
          <GuestRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </GuestRoute>
        }
      />

      <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

      <Route path={ROUTES.APP} element={<AppShell />}>
        <Route index element={<AppIndexRedirect />} />

        <Route
          path="admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/tickets"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/tickets/new"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminCreateTicketPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/tickets/:ticketId"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminTicketDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/clients"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminClientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/quotes"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminQuotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/quotes/new"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminCreateQuotePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/quotes/:quoteId"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminQuoteDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/technical-reports"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminTechnicalReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/technical-reports/new"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminCreateTechnicalReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/technical-reports/:reportId"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminTechnicalReportDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/catalog"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminCatalogPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="client/dashboard"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <ClientDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="client/tickets"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <ClientTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="client/tickets/new"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <ClientCreateTicketPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="client/tickets/:ticketId"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <ClientTicketDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="client/profile"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <ClientProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
