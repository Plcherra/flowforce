
import { useState } from 'react';

import RoleGuard from '@/components/RoleGuard';
import UserManagement from '@/components/admin/UserManagement';
import AuditLog from '@/components/admin/AuditLog';
import AdminTabs from '@/components/admin/AdminTabs';
import RoleConfigurationTab from '@/components/roles/RoleConfigurationTab';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';

export default function Admin() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('users');
  const { t } = useTranslation();

  return (
    <RoleGuard permission="manageUsers" fallback={
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('admin.accessDenied')}</h1>
        <p className="text-gray-600">{t('admin.noPermission')}</p>
      </div>
    }>
      <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
        <div className={`${isMobile ? 'mb-4' : 'mb-8'}`}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 mb-2`}>{t('admin.title')}</h1>
          <p className="text-gray-600">{t('admin.description')}</p>
        </div>

        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className={isMobile ? 'mt-4' : 'mt-8'}>
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'roles' && <RoleConfigurationTab />}
          {activeTab === 'audit' && <AuditLog />}
        </div>
      </div>
    </RoleGuard>
  );
}
