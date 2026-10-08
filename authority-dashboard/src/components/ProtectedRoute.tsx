import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  user: any;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user }) => {
  if (!user) {
    // eslint-disable-next-line no-console
    console.log('ProtectedRoute: no user, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // When authenticated, render the nested route via Outlet.
  return <Outlet />;
};

export default ProtectedRoute;
