import { GeneralSettingsPanel } from '../components/GeneralSettingsPanel';
import { NotificationSettingsPanel } from '../components/NotificationSettingsPanel';
import { AICopilotSettingsPanel } from '../components/AICopilotSettingsPanel';
import { IntegrationSettingsPanel } from '../components/IntegrationSettingsPanel';
import { SystemSettingsLayout } from '../components/SystemSettingsLayout';

export default function SettingsPage() {
  return (
    <SystemSettingsLayout
      tabs={[
        { key: 'general', label: 'General', content: <GeneralSettingsPanel /> },
        { key: 'notifications', label: 'Notifications', content: <NotificationSettingsPanel /> },
        { key: 'copilot', label: 'AI Co-Pilot', content: <AICopilotSettingsPanel /> },
        { key: 'integrations', label: 'Integrations', content: <IntegrationSettingsPanel /> },
      ]}
    />
  );
}
