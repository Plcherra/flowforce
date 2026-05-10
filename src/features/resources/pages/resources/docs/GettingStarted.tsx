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
import { BookOpen, Clock, CheckCircle } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export default function GettingStarted() {
  const { t } = useTranslation();

  const breadcrumbItems = [
    { label: t("landing.resources"), href: "/resources" },
    { label: t("resources.documentation.title"), href: "/resources" },
    { label: "Getting Started Guide" },
  ];

  const steps = [
    {
      title: "Create Your Account",
      description: "Sign up for FlowForce and set up your company profile",
      completed: true,
    },
    {
      title: "Add Your Team",
      description: "Invite employees and set up departments and roles",
      completed: false,
    },
    {
      title: "Configure Settings",
      description: "Customize your workspace and preferences",
      completed: false,
    },
    {
      title: "Create Your First Schedule",
      description: "Set up shifts and assign employees",
      completed: false,
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
                <BookOpen className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <CardTitle className="text-2xl">
                    Getting Started Guide
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Everything you need to set up FlowForce for your team
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Guide</Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  10 min
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h3>Welcome to FlowForce!</h3>
              <p>
                This guide will walk you through the essential steps to get your
                team up and running with FlowForce. Follow these steps in order
                to ensure a smooth setup process.
              </p>

              <div className="space-y-4 mt-6">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 border rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {index + 1}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {step.title}
                      </h4>
                      <p className="text-gray-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mt-8">Next Steps</h3>
              <p>
                Once you've completed the basic setup, explore our other
                documentation sections:
              </p>
              <ul>
                <li>API Documentation for integration guidance</li>
                <li>User Manual for detailed feature explanations</li>
                <li>Integration Guides for connecting with other tools</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
