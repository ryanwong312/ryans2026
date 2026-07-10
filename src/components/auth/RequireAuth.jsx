import { Navigate, useLocation } from 'react-router-dom';

export default function RequireAuth({ children }) {
  const location = useLocation();
  
  // Check if user is logged in
  const authData = localStorage.getItem('auth_user');
  const isAuthenticated = !!authData;

  if (!isAuthenticated) {
    // Redirect to login page, but save the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Optional: check token expiry
  try {
    const { expires_at } = JSON.parse(authData);
    if (expires_at && Date.now() > expires_at) {
      // Token expired – clear and redirect to login
      localStorage.removeItem('auth_user');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  } catch {
    // invalid data
    localStorage.removeItem('auth_user');
    return <Navigate to="/login" replace />;
  }

  return children;
}