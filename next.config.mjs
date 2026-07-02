const aliasPath = './src/lib/router-adapter';
const migrationAliases = {
  '@app-shell': './src/app-shell',
  '@features': './src/features',
  '@server': './src/server',
  '@shared': './src/shared',
  'react-router-dom': aliasPath,
};

// Phone/tablet LAN testing: set ALLOWED_DEV_ORIGINS=192.168.0.21 (comma-separated) in .env.local
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? '192.168.0.21')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  allowedDevOrigins,
  // Optimize webpack for faster dev builds
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...migrationAliases,
    };
    
    // Speed up dev builds (only modify if needed)
    if (dev && !isServer) {
      // Faster source maps in dev
      if (!config.devtool) {
        config.devtool = 'eval-cheap-module-source-map';
      }
    }
    
    return config;
  },
  turbopack: {
    resolveAlias: migrationAliases,
  },
  // Experimental features for faster dev
  experimental: {
    // Enable faster refresh
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'date-fns',
    ],
  },
  async redirects() {
    return [
      { source: '/dashboard', destination: '/app/dashboard', permanent: false },
      { source: '/messages', destination: '/app/messages', permanent: false },
      { source: '/calendar', destination: '/app/calendar', permanent: false },
      { source: '/meetings', destination: '/app/meetings', permanent: false },
      { source: '/employees', destination: '/app/employees', permanent: false },
      { source: '/employee-directory', destination: '/app/employees', permanent: false },
      { source: '/invite-employee', destination: '/app/employees?invite=1', permanent: false },
      { source: '/position-management', destination: '/app/position-management', permanent: false },
      { source: '/performance', destination: '/app/performance', permanent: false },
      { source: '/time-off', destination: '/app/enhanced-scheduling?panel=timeoff', permanent: false },
      { source: '/recognition', destination: '/app/recognition', permanent: false },
      { source: '/leaderboard', destination: '/app/leaderboard', permanent: false },
      { source: '/expenses', destination: '/app/expenses', permanent: false },
      { source: '/forms', destination: '/app/forms', permanent: false },
      { source: '/company-updates', destination: '/app/company-updates', permanent: false },
      { source: '/inventory-actions', destination: '/app/inventory-actions', permanent: false },
      { source: '/inventory-count-execution', destination: '/app/inventory-count-execution', permanent: false },
      { source: '/items-setup', destination: '/app/items-setup', permanent: false },
      { source: '/purchasing', destination: '/app/purchasing', permanent: false },
      { source: '/enhanced-scheduling', destination: '/app/enhanced-scheduling', permanent: false },
      { source: '/schedule-lobby', destination: '/app/enhanced-scheduling', permanent: false },
      { source: '/certifications', destination: '/app/certifications', permanent: false },
      { source: '/learning-center', destination: '/app/learning-center', permanent: false },
      { source: '/resources', destination: '/app/resources', permanent: false },
      { source: '/cookbook', destination: '/app/cookbook', permanent: false },
      { source: '/ai-insights', destination: '/app/ai-insights', permanent: false },
      { source: '/settings', destination: '/app/settings', permanent: false },
      { source: '/profile', destination: '/app/profile', permanent: false },
      { source: '/admin', destination: '/app/admin', permanent: false },
      { source: '/sections-permissions', destination: '/app/sections-permissions', permanent: false },
      { source: '/add-section', destination: '/app/add-section', permanent: false },
      { source: '/permission-demo', destination: '/app/permission-demo', permanent: false },
      { source: '/tasks', destination: '/app/tasks', permanent: false },
      { source: '/goals', destination: '/app/goals', permanent: false },
      { source: '/operations', destination: '/app/operations', permanent: false },
      { source: '/analytics', destination: '/app/analytics', permanent: false },
      { source: '/reports', destination: '/app/reports', permanent: false },
      { source: '/help-desk', destination: '/app/help-desk', permanent: false },
      { source: '/helpdesk', destination: '/app/help-desk', permanent: false },
    ];
  },
};

export default nextConfig;
