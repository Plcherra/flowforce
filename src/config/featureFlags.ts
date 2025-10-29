// Feature flag configuration for the application
export interface FeatureFlags {
  inventory: {
    cookbook: boolean;
    prepPar: boolean;
    wasteTracking: boolean;
    purchaseOrders: boolean;
    advancedReporting: boolean;
    barcodeScanning: boolean;
    lotTracking: boolean;
  };
  scheduling: {
    aiOptimization: boolean;
    shiftSwapping: boolean;
    timeClockIntegration: boolean;
  };
  reports: {
    customReports: boolean;
    dataExport: boolean;
    automatedReports: boolean;
  };
  admin: {
    companyRoles: boolean;
    permissionOverrides: boolean;
    auditLogs: boolean;
  };
  operations: {
    engagementMetrics: boolean;
  };
  intelligence: {
    oodaLoop: boolean;
    connecteamFormsSync: boolean;
  };
}

// Default feature flags - can be overridden by environment or user settings
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  inventory: {
    cookbook: false, // Not ready yet
    prepPar: true,
    wasteTracking: true,
    purchaseOrders: true,
    advancedReporting: false, // Not ready yet
    barcodeScanning: false, // Not ready yet
    lotTracking: false, // Not ready yet
  },
  scheduling: {
    aiOptimization: false,
    shiftSwapping: true,
    timeClockIntegration: false,
  },
  reports: {
    customReports: true,
    dataExport: true,
    automatedReports: false,
  },
  admin: {
    companyRoles: true,
    permissionOverrides: true,
    auditLogs: false,
  },
  operations: {
    engagementMetrics: false,
  },
  intelligence: {
    oodaLoop: true,
    connecteamFormsSync: false,
  },
};

// Helper function to get nested feature flag value
export function getFeatureFlag(flags: FeatureFlags, path: string): boolean {
  const parts = path.split('.');
  let current: any = flags;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }
  
  return Boolean(current);
}
