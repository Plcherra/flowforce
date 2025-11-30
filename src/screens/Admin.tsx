import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RoleGuard from '@/components/RoleGuard';
import UserManagement from '@/components/admin/UserManagement';
import AuditLog from '@/components/admin/AuditLog';
import AdminTabs from '@/components/admin/AdminTabs';
import RoleConfigurationTab from '@/components/roles/RoleConfigurationTab';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

export default function Admin() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const auditEnabled = useFeatureFlag('admin.auditLogs');
  const initialTab = searchParams.get('tab') ?? 'users';
  const safeInitialTab = !auditEnabled && initialTab === 'audit' ? 'users' : initialTab;
  const [activeTab, setActiveTab] = useState(safeInitialTab);
  const { t } = useTranslation();

  useEffect(() => {
    const paramTab = searchParams.get('tab');
    if (!paramTab) return;

    if (!auditEnabled && paramTab === 'audit') {
      setActiveTab('users');
      return;
    }

    if (paramTab !== activeTab) {
      setActiveTab(paramTab);
    }
  }, [searchParams, activeTab, auditEnabled]);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!auditEnabled && activeTab === 'audit') {
        next.set('tab', 'users');
      } else {
        next.set('tab', activeTab);
      }
      return next;
    });
  }, [activeTab, auditEnabled, setSearchParams]);

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
          {auditEnabled && activeTab === 'audit' && <AuditLog />}
        </div>
      </div>
    </RoleGuard>
  );
}
