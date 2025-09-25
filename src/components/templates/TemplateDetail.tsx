
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage
} from '@/components/ui/breadcrumb';
import { Check, ArrowRight } from 'lucide-react';
import { RetailScene } from '@/components/illustrations/RetailScene';
import { Template, TemplateKey } from '@/data/templateData';

interface TemplateDetailProps {
  templateId: TemplateKey;
  template: Template;
}

export function TemplateDetail({ templateId, template }: TemplateDetailProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-4">
          <BackButton />
        </div>

        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="hover:text-primary">
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/templates" className="hover:text-primary">
                  Templates
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{template.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header Section with Illustration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Left Side - Content */}
          <div className="flex flex-col justify-center">
            <div className={`w-24 h-24 bg-gradient-to-br ${template.gradient} rounded-3xl flex items-center justify-center mb-6`}>
              <template.icon className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              {template.title}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {template.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                className={`bg-gradient-to-r ${template.gradient} text-white px-8 py-4`}
                onClick={() => navigate(`/register?template=${templateId}`)}
              >
                Get Started with {template.title}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-4">
                Schedule Demo
              </Button>
            </div>
          </div>

          {/* Right Side - Illustration */}
          <div className="h-96 lg:h-[500px]">
            {templateId === 'retail' ? (
              <RetailScene />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${template.gradient} rounded-lg opacity-10 flex items-center justify-center`}>
                <template.icon className="h-24 w-24 text-white/50" />
              </div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Features</h2>
            <div className="space-y-4">
              {template.features.map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-6 h-6 ${template.bgColor} rounded-full flex items-center justify-center mr-4`}>
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Included Modules</h2>
            <div className="space-y-4">
              {template.modules.map((module, index) => (
                <Card key={index} className="border-l-4" style={{ borderLeftColor: template.bgColor }}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{module.name}</h3>
                    <p className="text-sm text-gray-600">{module.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Set up your {template.title.toLowerCase()} in minutes with our pre-configured template. 
              Customize it to match your specific workflow needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className={`bg-gradient-to-r ${template.gradient} text-white px-8 py-4`}
                onClick={() => navigate(`/register?template=${templateId}`)}
              >
                Start with {template.title}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-4">
                Schedule Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
