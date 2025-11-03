import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ui/error-boundary';
import AppShell from '@/components/AppShell';
import { ResourceRoutes } from "@/routes/resourceRoutes";
import { AppLayout } from '@/components/navigation/AppLayout';

// Lazy load components
const Index = lazy(() => import('../pages/Index.tsx'));
const Auth = lazy(() => import('../pages/Auth.tsx'));
const Register = lazy(() => import('../pages/Register.tsx'));
const Dashboard = lazy(() => import('../pages/Dashboard.tsx'));
const CompanyRegistration = lazy(() => import('../pages/CompanyRegistration.tsx'));

// Lazy load all other pages
const Messages = lazy(() => import('../pages/MessagesPage.tsx'));
const EventsHub = lazy(() => import('../pages/events/EventsHub.tsx'));
const Employees = lazy(() => import('../pages/Employees.tsx'));
const PositionManagement = lazy(() => import('../pages/PositionManagement.tsx'));
const Goals = lazy(() => import('../pages/Goals.tsx'));
const Tasks = lazy(() => import('../pages/Tasks.tsx'));
const Performance = lazy(() => import('../pages/Performance.tsx'));
const TimeOff = lazy(() => import('../pages/TimeOff.tsx'));
const Recognition = lazy(() => import('../pages/Recognition.tsx'));
const Expenses = lazy(() => import('../pages/Expenses.tsx'));
const Leaderboard = lazy(() => import('../pages/Leaderboard.tsx'));
// Use explicit path to avoid barrel/star export resolution issues
// Import Forms eagerly to avoid dynamic import resolution issues in dev
import Forms from '../pages/Forms.tsx';
const CompanyUpdates = lazy(() => import('../pages/CompanyUpdates.tsx'));
const Analytics = lazy(() => import('../pages/Analytics.tsx'));
const Reports = lazy(() => import('../pages/Reports.tsx'));
const InventoryActions = lazy(() => import('../pages/InventoryActions.tsx'));
const InventoryCountExecution = lazy(() => import('../pages/InventoryCountExecution.tsx'));
const ItemsSetup = lazy(() => import('../pages/ItemsSetup.tsx'));
const Purchasing = lazy(() => import('../pages/Purchasing.tsx'));
const EnhancedScheduling = lazy(() => import('../pages/EnhancedScheduling.tsx'));
const ScheduleLobby = lazy(() => import('../pages/ScheduleLobby.tsx'));
const Operations = lazy(() => import('../modules/operations/pages/OperationsPage.tsx'));
const Certifications = lazy(() => import('../pages/Certifications.tsx'));
const LearningCenter = lazy(() => import('../pages/LearningCenter.tsx'));
const Resources = lazy(() => import('../pages/Resources.tsx'));
const Cookbook = lazy(() => import('../pages/Cookbook.tsx'));
const AIInsights = lazy(() => import('../pages/AIInsights.tsx'));
const Settings = lazy(() => import('../modules/system/pages/SettingsPage.tsx'));
const Profile = lazy(() => import('../pages/Profile.tsx'));
const Admin = lazy(() => import('../pages/Admin.tsx'));
const SectionsPermissions = lazy(() => import('../pages/SectionsPermissions.tsx'));
const AddSection = lazy(() => import('../pages/AddSection.tsx'));
const PermissionDemo = lazy(() => import('../pages/PermissionDemo.tsx'));
const DynamicSection = lazy(() => import('../components/sections/DynamicSection.tsx'));
// Template components - use the page wrappers
const TemplatesOverview = lazy(() => import('../pages/Templates.tsx'));
const TemplateDetail = lazy(() => import('../pages/TemplateDetail.tsx'));
const Features = lazy(() => import('../pages/Features.tsx'));
const Pricing = lazy(() => import('../pages/Pricing.tsx'));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: "auth",
        element: <Auth />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "onboarding",
        element: <Navigate to="/company-registration" replace />,
      },
      {
        path: "company-registration",
        element: <CompanyRegistration />,
      },
      {
        path: "features",
        element: <Features />,
      },
      {
        path: "templates",
        element: <TemplatesOverview />,
      },
      {
        path: "templates/:templateId",
        element: <TemplateDetail />,
      },
      {
        path: "pricing",
        element: <Pricing />,
      },
      {
        path: "app",
        element: (
          <ErrorBoundary showDetails={import.meta.env.DEV}>
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          </ErrorBoundary>
        ),
        children: [
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "messages",
            element: <Messages />,
          },
          {
            path: "messages/:filter",
            element: <Messages />,
          },
          {
            path: "calendar",
            element: <EventsHub />,
          },
          {
            path: "meetings",
            element: <EventsHub />,
          },
          {
            path: "employees",
            element: <Employees />,
          },
          {
            path: "operations",
            element: <Operations />,
          },
          {
            path: "goals",
            element: <Goals />,
          },
          {
            path: "invite-employee",
            element: <Navigate to="/app/employees?invite=1" replace />,
          },
          {
            path: "position-management",
            element: <PositionManagement />,
          },
          {
            path: "tasks",
            element: <Tasks />,
          },
          {
            path: "performance",
            element: <Performance />,
          },
          {
            path: "time-off",
            element: <Navigate to="/app/scheduling/timeoff" replace />,
          },
          {
            path: "scheduling/timeoff",
            element: <TimeOff />,
          },
          {
            path: "recognition",
            element: <Recognition />,
          },
          {
            path: "leaderboard",
            element: <Leaderboard />,
          },
          {
            path: "expenses",
            element: <Expenses />,
          },
          {
            path: "forms",
            element: <Forms />,
          },
          {
            path: "company-updates",
            element: <CompanyUpdates />,
          },
          {
            path: "analytics",
            element: <Analytics />,
          },
          {
            path: "reports",
            element: <Reports />,
          },
          {
            path: "inventory-actions",
            element: <InventoryActions />,
          },
          {
            path: "inventory-count-execution",
            element: <InventoryCountExecution />,
          },
          {
            path: "items-setup",
            element: <ItemsSetup />,
          },
          {
            path: "purchasing",
            element: <Purchasing />,
          },
          {
            path: "enhanced-scheduling",
            element: <EnhancedScheduling />,
          },
          {
            path: "schedule-lobby",
            element: <ScheduleLobby />,
          },
          {
            path: "availability",
            element: <Navigate to="/app/enhanced-scheduling?tab=availability" replace />,
          },
          {
            path: "availability/manage",
            element: <Navigate to="/app/enhanced-scheduling?tab=availability&availability=team" replace />,
          },
          {
            path: "certifications",
            element: <Certifications />,
          },
          {
            path: "learning-center",
            element: <LearningCenter />,
          },
          {
            path: "resources/*",
            element: <ResourceRoutes />,
          },
          {
            path: "cookbook",
            element: <Cookbook />,
          },
          {
            path: "ai-insights",
            element: <AIInsights />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
          {
            path: "admin",
            element: <Admin />,
          },
          {
            path: "sections-permissions",
            element: <SectionsPermissions />,
          },
          {
            path: "add-section",
            element: <AddSection />,
          },
          {
            path: "permission-demo",
            element: <PermissionDemo />,
          },
          {
            path: "section/:path/*",
            element: <DynamicSection />,
          },
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
        ],
      },
      // Legacy route redirects
      {
        path: "dashboard",
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: "messages",
        element: <Navigate to="/app/messages" replace />,
      },
      {
        path: "calendar",
        element: <Navigate to="/app/calendar" replace />,
      },
      {
        path: "meetings",
        element: <Navigate to="/app/meetings" replace />,
      },
      {
        path: "employees",
        element: <Navigate to="/app/employees" replace />,
      },
      {
        path: "invite-employee",
        element: <Navigate to="/app/employees?invite=1" replace />,
      },
      {
        path: "position-management",
        element: <Navigate to="/app/position-management" replace />,
      },
      {
        path: "performance",
        element: <Navigate to="/app/performance" replace />,
      },
          {
            path: "time-off",
            element: <Navigate to="/app/scheduling/timeoff" replace />,
          },
      {
        path: "recognition",
        element: <Navigate to="/app/recognition" replace />,
      },
      {
        path: "leaderboard",
        element: <Navigate to="/app/leaderboard" replace />,
      },
      {
        path: "expenses",
        element: <Navigate to="/app/expenses" replace />,
      },
      {
        path: "forms",
        element: <Navigate to="/app/forms" replace />,
      },
      {
        path: "company-updates",
        element: <Navigate to="/app/company-updates" replace />,
      },
      {
        path: "inventory-actions",
        element: <Navigate to="/app/inventory-actions" replace />,
      },
      {
        path: "inventory-count-execution", 
        element: <Navigate to="/app/inventory-count-execution" replace />,
      },
      {
        path: "items-setup",
        element: <Navigate to="/app/items-setup" replace />,
      },
      {
        path: "purchasing",
        element: <Navigate to="/app/purchasing" replace />,
      },
      {
        path: "enhanced-scheduling",
        element: <Navigate to="/app/enhanced-scheduling" replace />,
      },
      {
        path: "schedule-lobby",
        element: <Navigate to="/app/schedule-lobby" replace />,
      },
      {
        path: "certifications",
        element: <Navigate to="/app/certifications" replace />,
      },
      {
        path: "learning-center",
        element: <Navigate to="/app/learning-center" replace />,
      },
      {
        path: "resources",
        element: <Navigate to="/app/resources" replace />,
      },
      {
        path: "cookbook",
        element: <Navigate to="/app/cookbook" replace />,
      },
      {
        path: "ai-insights",
        element: <Navigate to="/app/ai-insights" replace />,
      },
      {
        path: "settings",
        element: <Navigate to="/app/settings" replace />,
      },
      {
        path: "profile",
        element: <Navigate to="/app/profile" replace />,
      },
      {
        path: "admin",
        element: <Navigate to="/app/admin" replace />,
      },
      {
        path: "sections-permissions",
        element: <Navigate to="/app/sections-permissions" replace />,
      },
      {
        path: "add-section",
        element: <Navigate to="/app/add-section" replace />,
      },
      {
        path: "permission-demo",
        element: <Navigate to="/app/permission-demo" replace />,
      },
      {
        path: "employee-directory",
        element: <Navigate to="/app/employees" replace />,
      },
      {
        path: "*",
        element: <Navigate to="/app/dashboard" replace />,
      },
    ],
  },
]);
