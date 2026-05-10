import { useTranslation } from "react-i18next";
import Breadcrumbs from "@/features/resources/components/Breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book, Clock, ChevronRight } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export default function UserManual() {
  const { t } = useTranslation();

  const breadcrumbItems = [
    { label: t("landing.resources"), href: "/resources" },
    { label: t("resources.documentation.title"), href: "/resources" },
    { label: "User Manual" },
  ];

  const sections = [
    {
      title: "Dashboard Overview",
      description: "Understanding your main dashboard and key metrics",
      pages: 5,
    },
    {
      title: "Employee Management",
      description: "Adding, editing, and managing employee profiles",
      pages: 8,
    },
    {
      title: "Scheduling",
      description: "Creating schedules, managing shifts, and time tracking",
      pages: 12,
    },
    {
      title: "Task Management",
      description: "Creating, assigning, and tracking tasks and workflows",
      pages: 7,
    },
    {
      title: "Forms & Documents",
      description: "Building forms, collecting data, and document management",
      pages: 6,
    },
    {
      title: "Reporting & Analytics",
      description: "Generating reports and analyzing business metrics",
      pages: 9,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Breadcrumbs items={breadcrumbItems} />
          <BackButton />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <Book className="h-6 w-6 text-orange-600 mr-3" />
                <div>
                  <CardTitle className="text-2xl">User Manual</CardTitle>
                  <CardDescription className="mt-2">
                    Comprehensive guide to all FlowForce features
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Manual</Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  45 min
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h3>Table of Contents</h3>
              <p>
                This comprehensive user manual covers all aspects of using
                FlowForce. Click on any section below to jump to detailed
                instructions and examples.
              </p>

              <div className="space-y-3 mt-6">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {section.title}
                          </h4>
                          <div className="flex items-center text-sm text-gray-500">
                            {section.pages} pages
                          </div>
                        </div>
                        <p className="text-gray-600">{section.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 ml-4" />
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mt-8">Quick Start</h3>
              <p>New to FlowForce? Start with these essential sections:</p>
              <ul>
                <li>
                  <strong>Dashboard Overview</strong> - Get familiar with the
                  interface
                </li>
                <li>
                  <strong>Employee Management</strong> - Set up your team
                </li>
                <li>
                  <strong>Scheduling</strong> - Create your first schedule
                </li>
              </ul>

              <h3>Advanced Features</h3>
              <p>
                Once you're comfortable with the basics, explore advanced
                features like:
              </p>
              <ul>
                <li>Automated workflows and task dependencies</li>
                <li>Custom form builder and digital signatures</li>
                <li>Advanced reporting and data analytics</li>
                <li>API integrations and custom webhooks</li>
              </ul>

              <h3>Need Help?</h3>
              <p>
                Can't find what you're looking for? Check out our other
                resources:
              </p>
              <ul>
                <li>Getting Started Guide for quick setup</li>
                <li>API Documentation for developers</li>
                <li>Integration Guides for connecting other tools</li>
                <li>Community Forum for user discussions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
