import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ui/error-boundary';
import AppShell from '@/components/AppShell';
import { ResourceRoutes } from "@/routes/resourceRoutes";
import { AppLayout } from '@/components/navigation/AppLayout';

// Lazy load components
const Index = lazy(() => import('@/pages/Index'));
const Auth = lazy(() => import('@/pages/Auth'));
const Register = lazy(() => import('@/pages/Register'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CompanyRegistration = lazy(() => import('@/pages/CompanyRegistration'));

// Lazy load all other pages
const Messages = lazy(() => import('@/pages/MessagesPage'));
const Calendar = lazy(() => import('@/pages/events/Calendar'));
const Meetings = lazy(() => import('@/pages/events/Meetings'));
const Employees = lazy(() => import('@/pages/Employees'));
const InviteEmployee = lazy(() => import('@/pages/InviteEmployee'));
const PositionManagement = lazy(() => import('@/pages/PositionManagement'));
const Performance = lazy(() => import('@/pages/Performance'));
const TimeOff = lazy(() => import('@/pages/TimeOff'));
const Recognition = lazy(() => import('@/pages/Recognition'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const Forms = lazy(() => import('@/pages/Forms'));
const CompanyUpdates = lazy(() => import('@/pages/CompanyUpdates'));
const InventoryActions = lazy(() => import('@/pages/InventoryActions'));
const InventoryCountExecution = lazy(() => import('@/pages/InventoryCountExecution'));
const ItemsSetup = lazy(() => import('@/pages/ItemsSetup'));
const Purchasing = lazy(() => import('@/pages/Purchasing'));
const EnhancedScheduling = lazy(() => import('@/pages/EnhancedScheduling'));
const ScheduleLobby = lazy(() => import('@/pages/ScheduleLobby'));
const Certifications = lazy(() => import('@/pages/Certifications'));
const LearningCenter = lazy(() => import('@/pages/LearningCenter'));
const Resources = lazy(() => import('@/pages/Resources'));
const Cookbook = lazy(() => import('@/pages/Cookbook'));
const AIInsights = lazy(() => import('@/pages/AIInsights'));
const Settings = lazy(() => import('@/pages/Settings'));
const Admin = lazy(() => import('@/pages/Admin'));
const SectionsPermissions = lazy(() => import('@/pages/SectionsPermissions'));
const AddSection = lazy(() => import('@/pages/AddSection'));
const PermissionDemo = lazy(() => import('@/pages/PermissionDemo'));
// Template components - use the page wrappers
const TemplatesOverview = lazy(() => import('@/pages/Templates'));
const TemplateDetail = lazy(() => import('@/pages/TemplateDetail'));
const Features = lazy(() => import('@/pages/Features'));
const Pricing = lazy(() => import('@/pages/Pricing'));

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
          <ErrorBoundary>
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
            path: "calendar",
            element: <Calendar />,
          },
          {
            path: "meetings",
            element: <Meetings />,
          },
          {
            path: "employees",
            element: <Employees />,
          },
          {
            path: "invite-employee",
            element: <InviteEmployee />,
          },
          {
            path: "position-management",
            element: <PositionManagement />,
          },
          {
            path: "performance",
            element: <Performance />,
          },
          {
            path: "time-off",
            element: <TimeOff />,
          },
          {
            path: "recognition",
            element: <Recognition />,
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
        element: <Navigate to="/app/invite-employee" replace />,
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
        element: <Navigate to="/app/time-off" replace />,
      },
      {
        path: "recognition",
        element: <Navigate to="/app/recognition" replace />,
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
        path: "*",
        element: <Navigate to="/app/dashboard" replace />,
      },
    ],
  },
]);