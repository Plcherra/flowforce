
import DocCard from './DocCard';
import BlogCard from './BlogCard';
import VideoCard from './VideoCard';
import DownloadCard from './DownloadCard';
import { ResourceItem } from '@/types/common';

interface ResourceCategory {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  key: 'documentation' | 'blog' | 'videos' | 'downloads';
}

interface ResourceSectionProps {
  category: ResourceCategory;
  resources: ResourceItem[];
}

export default function ResourceSection({ category, resources }: ResourceSectionProps) {
  const renderResourceCard = (resource: ResourceItem) => {
    switch (category.key) {
      case 'documentation':
        return (
          <DocCard
            key={resource.id}
            title={resource.title}
            description={resource.description}
            type={resource.type}
            readTime={resource.readTime}
            url={resource.url}
          />
        );
      case 'blog':
        return (
          <BlogCard
            key={resource.id}
            title={resource.title}
            description={resource.description}
            type={resource.type}
            author={resource.author}
            readTime={resource.readTime}
            url={resource.url}
            publishDate={resource.publishDate}
          />
        );
      case 'videos':
        return (
          <VideoCard
            key={resource.id}
            title={resource.title}
            description={resource.description}
            duration={resource.duration}
            url={resource.url}
            thumbnail={resource.thumbnail}
            embedUrl={resource.embedUrl}
          />
        );
      case 'downloads':
        return (
          <DownloadCard
            key={resource.id}
            title={resource.title}
            description={resource.description}
            type={resource.type}
            platforms={resource.platforms}
            format={resource.format}
            downloadUrl={resource.downloadUrl}
          />
        );
      default:
        return null;
    }
  };

  return (
    <section>
      <div className="flex items-center mb-8">
        <div className={`w-12 h-12 ${category.bgColor} rounded-xl flex items-center justify-center mr-4`}>
          <category.icon className={`h-6 w-6 ${category.color}`} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{category.title}</h2>
          <p className="text-gray-600">{category.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resources.map(renderResourceCard)}
      </div>
    </section>
  );
}
