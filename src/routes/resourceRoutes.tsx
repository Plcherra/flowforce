
import { Routes, Route } from 'react-router-dom';
import Resources from '@/pages/Resources';
import DocumentationDetail from '@/pages/resources/DocumentationDetail';
import BlogDetail from '@/pages/resources/BlogDetail';
import VideoDetail from '@/pages/resources/VideoDetail';
import GettingStarted from '@/pages/resources/docs/GettingStarted';
import ApiDocumentation from '@/pages/resources/docs/ApiDocumentation';
import IntegrationGuides from '@/pages/resources/docs/IntegrationGuides';
import UserManual from '@/pages/resources/docs/UserManual';

export function ResourceRoutes() {
  return (
    <Routes>
      <Route index element={<Resources />} />
      <Route path="docs/getting-started" element={<GettingStarted />} />
      <Route path="docs/api" element={<ApiDocumentation />} />
      <Route path="docs/integrations" element={<IntegrationGuides />} />
      <Route path="docs/user-manual" element={<UserManual />} />
      <Route path="docs/:docId" element={<DocumentationDetail />} />
      <Route path="blog/:postId" element={<BlogDetail />} />
      <Route path="videos/:videoId" element={<VideoDetail />} />
    </Routes>
  );
}
