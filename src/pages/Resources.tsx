import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  FileText, 
  Video, 
  Download,
  Home
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ResourceSection from '@/components/resources/ResourceSection';
import HelpSection from '@/components/resources/HelpSection';
import LoadingSpinner from '@/components/resources/LoadingSpinner';

interface ResourceData {
  documentation: any[];
  blog: any[];
  videos: any[];
  downloads: any[];
}

export default function Resources() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [resourceData, setResourceData] = useState<ResourceData | null>(null);
  const [loading, setLoading] = useState(true);

  const resourceCategories = [
    {
      title: t('resources.documentation.title'),
      description: t('resources.documentation.description'),
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      key: 'documentation' as const
    },
    {
      title: t('resources.blog.title'),
      description: t('resources.blog.description'),
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      key: 'blog' as const
    },
    {
      title: t('resources.videos.title'),
      description: t('resources.videos.description'),
      icon: Video,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      key: 'videos' as const
    },
    {
      title: t('resources.downloads.title'),
      description: t('resources.downloads.description'),
      icon: Download,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      key: 'downloads' as const
    }
  ];

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await fetch('/data/resources.json');
        const data = await response.json();
        setResourceData(data);
      } catch (error) {
        console.error('Failed to fetch resources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Back to Home Button */}
      <div className="fixed top-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/')}
          className="bg-white shadow-lg hover:bg-gray-50"
        >
          <Home className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {t('resources.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('resources.subtitle')}
          </p>
        </div>

        {/* Resource Sections */}
        {resourceData && (
          <div className="space-y-16">
            {resourceCategories.map((category) => {
              const resources = resourceData[category.key];
              
              return (
                <ResourceSection
                  key={category.title}
                  category={category}
                  resources={resources}
                />
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <HelpSection />
      </div>
    </div>
  );
}
