import { Navigate } from 'react-router-dom';

export default function HelpDeskRedirectPage() {
  return <Navigate to="/app/messages/helpdesk" replace />;
}
