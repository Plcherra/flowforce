
import { Zap, Globe, Settings, Key } from 'lucide-react';

export const integrations = [
  {
    name: 'Slack',
    description: 'Sync notifications and messages with your Slack workspace',
    difficulty: 'Easy',
    time: '5 min',
    icon: <Zap className="h-6 w-6 text-purple-600" />,
    steps: [
      'Open your Slack workspace and go to Apps',
      'Search for "FlowForce" and click "Add to Slack"',
      'Authorize FlowForce to access your workspace',
      'Choose which channels to sync notifications to',
      'Test the integration by sending a test message'
    ],
    requirements: ['Slack workspace admin access', 'FlowForce Pro plan or higher'],
    benefits: ['Real-time notifications', 'Team collaboration', 'Automated updates']
  },
  {
    name: 'Google Calendar',
    description: 'Sync schedules and events with Google Calendar',
    difficulty: 'Medium',
    time: '15 min',
    icon: <Globe className="h-6 w-6 text-blue-600" />,
    steps: [
      'Go to FlowForce Settings > Integrations',
      'Click "Connect Google Calendar"',
      'Sign in with your Google account',
      'Grant calendar access permissions',
      'Select which calendars to sync',
      'Configure sync frequency (real-time, hourly, daily)',
      'Test by creating a shift in FlowForce'
    ],
    requirements: ['Google account', 'Calendar management permissions'],
    benefits: ['Two-way sync', 'Mobile calendar access', 'Conflict detection']
  },
  {
    name: 'Zapier',
    description: 'Connect FlowForce with 5000+ apps through Zapier',
    difficulty: 'Medium',
    time: '20 min',
    icon: <Settings className="h-6 w-6 text-orange-600" />,
    steps: [
      'Create a Zapier account at zapier.com',
      'Search for "FlowForce" in the apps directory',
      'Choose a trigger event (new employee, shift change, etc.)',
      'Connect your FlowForce account using API key',
      'Select the action app (Gmail, Sheets, etc.)',
      'Configure the action details',
      'Test your Zap and turn it on'
    ],
    requirements: ['Zapier account', 'FlowForce API access'],
    benefits: ['Unlimited app connections', 'Custom workflows', 'Automated data transfer']
  },
  {
    name: 'Webhook Integration',
    description: 'Set up custom webhooks for real-time data sync',
    difficulty: 'Advanced',
    time: '30 min',
    icon: <Key className="h-6 w-6 text-red-600" />,
    steps: [
      'Generate API credentials in FlowForce Settings',
      'Set up your webhook endpoint URL',
      'Configure webhook events (employee actions, schedule changes)',
      'Implement webhook signature verification',
      'Test webhook delivery with sample data',
      'Set up error handling and retry logic',
      'Monitor webhook logs for debugging'
    ],
    requirements: ['Developer access', 'Web server with HTTPS', 'Programming knowledge'],
    benefits: ['Real-time data sync', 'Custom integrations', 'Full API access']
  }
];
