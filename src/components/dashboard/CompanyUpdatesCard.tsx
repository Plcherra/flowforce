import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bell, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Plus,
  Pin,
  MessageSquare,
  Users,
  Building
} from 'lucide-react';
import { useCan } from '@/hooks/useCan';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import CreateUpdateWizard from '../updates/CreateUpdateWizard';
import { useCompanyUpdates } from '@/hooks/useCompanyUpdates';
import { WizardFormData } from '../updates/CreateUpdateWizard';

interface CompanyUpdate {
  id: string;
  title: string;
  body: string;
  type: 'announcement' | 'news' | 'event' | 'policy';
  priority: 'low' | 'medium' | 'high';
  author: {
    name: string;
    avatar?: string;
    role: string;
  };
  createdAt: Date;
  isPinned?: boolean;
  category: string;
  readBy?: string[];
}
const getTypeIcon = (type: CompanyUpdate['type']) => {
  const iconMap = {
    announcement: Bell,
    news: MessageSquare,
    event: Calendar,
    policy: Building
  };
  return iconMap[type];
};

const getTypeColor = (type: CompanyUpdate['type']) => {
  const colorMap = {
    announcement: 'bg-blue-500/10 text-blue-600 border-blue-200',
    news: 'bg-green-500/10 text-green-600 border-green-200',
    event: 'bg-purple-500/10 text-purple-600 border-purple-200',
    policy: 'bg-gray-500/10 text-gray-600 border-gray-200'
  };
  return colorMap[type];
};

const getPriorityColor = (priority: CompanyUpdate['priority']) => {
  const colorMap = {
    high: 'bg-red-500/10 text-red-600 border-red-200',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    low: 'bg-green-500/10 text-green-600 border-green-200'
  };
  return colorMap[priority];
};

interface CompanyUpdatesCardProps {
  className?: string;
}

export default function CompanyUpdatesCard({ className }: CompanyUpdatesCardProps) {
  const { can } = useCan();
  const navigate = useNavigate();
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const { updates, createUpdate } = useCompanyUpdates();

  const handleUpdateComplete = (formData: WizardFormData) => {
    // Convert WizardFormData to CompanyUpdate format
    void createUpdate({
      title: formData.title,
      body: formData.body,
      richContent: formData.richContent,
      type: formData.type,
      priority: formData.priority,
      isPinned: false // Could be derived from form data if needed
    });
  };

  const displayedUpdates = updates.slice(0, 3);
  const pinnedUpdates = updates.filter(update => update.isPinned);

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-lg">
                <Bell className="mr-2 h-5 w-5 text-primary" />
                Company Updates
              </CardTitle>
              <CardDescription>
                Latest announcements and company news
              </CardDescription>
            </div>
            {can('systemSettings') && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCreateWizardOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Update
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {updates.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground mb-3">No company updates yet</p>
              {can('systemSettings') && (
                <Button 
                  variant="outline" 
                  onClick={() => setCreateWizardOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Update
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show pinned updates first */}
              {pinnedUpdates.map((update) => (
                <div key={update.id} className="flex items-center gap-3 p-3 border rounded-lg bg-primary/5">
                  <Pin className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{update.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{update.body}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{update.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(update.publishDate), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show recent updates */}
              {displayedUpdates.filter(update => !update.isPinned).map((update) => (
                <div key={update.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{update.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{update.body}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{update.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(update.publishDate), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={() => navigate('/company-updates')}
              >
                <span>View All Updates ({updates.length})</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUpdateWizard
        open={createWizardOpen}
        onOpenChange={setCreateWizardOpen}
        onComplete={handleUpdateComplete}
      />
    </>
  );
}
