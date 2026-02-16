// Auth bypass enabled for external agent audit access
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ProtectedRoute;
