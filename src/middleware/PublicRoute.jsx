import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import Loading from '../jsx/components/Loading';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
     <Loading/>
    );
  }

  return !isAuthenticated() ? children : <Navigate to="/" replace />;
};

export default PublicRoute;
