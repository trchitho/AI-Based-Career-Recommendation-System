// This file is no longer used - routes go directly to CareerGroupsPage
import { Navigate } from 'react-router-dom';

const CareersPage = () => {
  return <Navigate to="/careers" replace />;
};

export default CareersPage;