export type ReleaseGateKind =
  | "supabase_drift_security"
  | "database_isolation"
  | "typecheck"
  | "next_build"
  | "docker_build"
  | "mobile_android_build"
  | "runtime_smoke";

export interface ReleaseGate {
  kind: ReleaseGateKind;
  workflow: string;
  command: string;
  requiredForMain: boolean;
  purpose: string;
}

export const productionReleaseGates = {
  releaseWorkflowPath: ".github/workflows/release-gates.yml",
  deployReadinessWorkflowPath: ".github/workflows/deploy-readiness.yml",
  localReleaseCommand: "npm run check:release",
  remoteDeployCommand: "npm run check:deploy",
  dockerImageTag: "flowforce-web:ci",
  mobileAndroidSyncScript: "mobile:android:sync",
  mobileAndroidBuildScript: "mobile:android:debug",
  gates: [
    {
      kind: "supabase_drift_security",
      workflow: "Deploy Readiness",
      command: "npm run check:supabase:remote-drift && npm run check:supabase",
      requiredForMain: true,
      purpose: "Prevent schema drift and RLS/security regressions from reaching production.",
    },
    {
      kind: "database_isolation",
      workflow: "Release Gates",
      command: "npm run test:db:security",
      requiredForMain: true,
      purpose: "Rebuild local Supabase and run tenant isolation/storage contract tests.",
    },
    {
      kind: "typecheck",
      workflow: "Release Gates",
      command: "npm run typecheck",
      requiredForMain: true,
      purpose: "Keep app, source, tests, and Supabase function TypeScript valid.",
    },
    {
      kind: "next_build",
      workflow: "Release Gates",
      command: "npm run build",
      requiredForMain: true,
      purpose: "Prove the production Next.js app compiles.",
    },
    {
      kind: "docker_build",
      workflow: "Release Gates",
      command: "docker build --tag flowforce-web:ci .",
      requiredForMain: true,
      purpose: "Prove the VPS deploy artifact builds in CI.",
    },
    {
      kind: "mobile_android_build",
      workflow: "Release Gates",
      command: "npm run mobile:android:sync && npm run mobile:android:debug",
      requiredForMain: true,
      purpose: "Prove the active Capacitor Android shell still compiles.",
    },
    {
      kind: "runtime_smoke",
      workflow: "Release Gates",
      command: "npm run test:e2e:onboarding && npm run test:smoke",
      requiredForMain: true,
      purpose: "Exercise production server auth/onboarding and visible modules.",
    },
  ] satisfies ReleaseGate[],
} as const;

export function buildProductionReleaseGateReadiness() {
  const gateKinds = new Set(productionReleaseGates.gates.map((gate) => gate.kind));

  return {
    keepsSupabaseGates: gateKinds.has("supabase_drift_security"),
    keepsDatabaseSecurityTests: gateKinds.has("database_isolation"),
    keepsBuildTypecheckSmoke:
      gateKinds.has("typecheck") &&
      gateKinds.has("next_build") &&
      gateKinds.has("runtime_smoke"),
    hasDockerBuildGate:
      gateKinds.has("docker_build") &&
      productionReleaseGates.dockerImageTag === "flowforce-web:ci",
    hasMobileBuildGate:
      gateKinds.has("mobile_android_build") &&
      productionReleaseGates.mobileAndroidSyncScript === "mobile:android:sync" &&
      productionReleaseGates.mobileAndroidBuildScript === "mobile:android:debug",
    hasMainBranchProtectionShape: productionReleaseGates.gates.every(
      (gate) => gate.requiredForMain,
    ),
  };
}

export function isProductionReleaseGatesReady() {
  return Object.values(buildProductionReleaseGateReadiness()).every(Boolean);
}
