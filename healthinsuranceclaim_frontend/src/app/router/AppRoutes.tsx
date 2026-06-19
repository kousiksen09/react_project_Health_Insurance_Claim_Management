import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { Layout } from '../../shared/components/Layout';
import { LoginForm, RegisterCustomerForm, RegisterHospitalForm } from '../../features/auth';
import { ProfilePage } from '../../features/profile';
import { ClaimsPage } from '../../features/claims';
import { CreateClaimForm, HospitalDashboardPage } from '../../features/hospital';
import { PendingClaimsPage, ClaimOfficerDashboardPage } from '../../features/claimofficer';
import { UsersManagementPage, CustomersManagementPage, HospitalsManagementPage, PoliciesManagementPage, ClaimsManagementPage, ClaimOfficersManagementPage } from '../../features/admin';
import { AdminDashboardPage } from '../../features/dashboard';
import { CustomerDashboardPage } from '../../features/customer';
import { NotificationsPage } from '../../features/notifications';
import { ROUTES } from '../../shared/utils/constants';
import { UserRole } from '../../shared/types';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={ROUTES.DASHBOARD} replace />;

  return <>{children}</>;
};

const DashboardPageWrapper = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  
  switch (user.role) {
    case UserRole.Admin:
      return <AdminDashboardPage />;
    case UserRole.Customer:
      return <CustomerDashboardPage />;
    case UserRole.Hospital:
      return <HospitalDashboardPage />;
    case UserRole.ClaimOfficer:
      return <ClaimOfficerDashboardPage />;
    default:
      return <Navigate to={ROUTES.LOGIN} replace />;
  }
};

export const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={
        isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <LoginForm />
      } />
      <Route path={ROUTES.REGISTER_CUSTOMER} element={
        isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <RegisterCustomerForm />
      } />
      <Route path={ROUTES.REGISTER_HOSPITAL} element={
        isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <RegisterHospitalForm />
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path={ROUTES.DASHBOARD.slice(1)} element={
          <ProtectedRoute>
            <DashboardPageWrapper />
          </ProtectedRoute>
        } />

        <Route path={ROUTES.CLAIMS.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.ClaimOfficer, UserRole.Admin, UserRole.Hospital]}>
            <ClaimsPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.MY_CLAIMS.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.Customer]}>
            <ClaimsPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.PENDING_CLAIMS.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.ClaimOfficer]}>
            <PendingClaimsPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.CREATE_CLAIM.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.Hospital]}>
            <CreateClaimForm />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.PROFILE.slice(1)} element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_USERS.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.Admin]}>
            <UsersManagementPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_CUSTOMERS.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.Admin]}>
            <CustomersManagementPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_HOSPITALS.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.Admin]}>
            <HospitalsManagementPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_POLICIES.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.Admin]}>
            <PoliciesManagementPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_CLAIMS.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.Admin]}>
            <ClaimsManagementPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_OFFICERS.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.Admin]}>
            <ClaimOfficersManagementPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.HOSPITALS.slice(1)} element={
          <ProtectedRoute allowedRoles={[UserRole.Admin]}>
            <Navigate to={ROUTES.ADMIN_HOSPITALS} replace />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.NOTIFICATIONS.slice(1)} element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        } />
        <Route path="policies" element={
          <ProtectedRoute>
            <Navigate to={ROUTES.DASHBOARD} replace />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
};