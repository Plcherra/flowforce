import { IdeaProvider } from '@/modules/operations/contexts/IdeaProvider';
import IdeaLayout from '@/modules/operations/components/idea/IdeaLayout';

export default function OperationsIntelligence() {
  return (
    <IdeaProvider>
      <div className="space-y-6 px-4 py-6 md:px-8 lg:px-12">
        <IdeaLayout />
      </div>
    </IdeaProvider>
  );
}
