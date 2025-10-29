import { Button } from '@/components/ui/button';
import { Users, Activity, Shield } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface AdminTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  const auditEnabled = useFeatureFlag('admin.auditLogs');

  return (
    <div className="flex space-x-4 mb-6">
      <Button
        variant={activeTab === 'users' ? 'default' : 'outline'}
        onClick={() => onTabChange('users')}
      >
        <Users className="h-4 w-4 mr-2" />
        User Management
      </Button>
      <Button
        variant={activeTab === 'roles' ? 'default' : 'outline'}
        onClick={() => onTabChange('roles')}
      >
        <Shield className="h-4 w-4 mr-2" />
        Role Configuration
      </Button>
      {auditEnabled && (
        <Button
          variant={activeTab === 'audit' ? 'default' : 'outline'}
          onClick={() => onTabChange('audit')}
        >
          <Activity className="h-4 w-4 mr-2" />
          Audit Log
        </Button>
      )}
    </div>
  );
}
