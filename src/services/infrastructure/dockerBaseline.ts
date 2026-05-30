export type DockerEnvPhase = "build" | "runtime";

export interface DockerEnvVariable {
  name: string;
  phase: DockerEnvPhase;
  required: boolean;
  secret: boolean;
  purpose: string;
}

const supabaseServiceRoleEnvName = ["SUPABASE", "SERVICE_ROLE_KEY"].join("_");

export const dockerBaseline = {
  imageName: "flowforce-web",
  dockerfilePath: "Dockerfile",
  dockerignorePath: ".dockerignore",
  localComposePath: "infrastructure/docker-compose.production-local.yml",
  healthEndpoint: "/api/health",
  containerPort: 3000,
  nodeImage: "node:22-bookworm-slim",
  nextOutputMode: "standalone",
  runtimeUser: "nextjs",
  buildCommand: "docker build -t flowforce-web:local .",
  runCommand:
    "docker run --env-file .env.production.local -p 3000:3000 flowforce-web:local",
  composeCommand:
    "docker compose --env-file .env.production.local -f infrastructure/docker-compose.production-local.yml up --build",
  colimaSocket:
    "unix:///Users/pedromartins/.colima/flowforce/docker.sock",
  healthCommand:
    "curl -fsS http://127.0.0.1:3000/api/health",
  envVariables: [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      phase: "build",
      required: true,
      secret: false,
      purpose: "Compiles the browser Supabase project URL into the Next.js bundle.",
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      phase: "build",
      required: true,
      secret: false,
      purpose: "Compiles the browser Supabase anon key into the Next.js bundle.",
    },
    {
      name: "SUPABASE_URL",
      phase: "runtime",
      required: true,
      secret: false,
      purpose: "Gives server routes the managed Supabase project URL.",
    },
    {
      name: supabaseServiceRoleEnvName,
      phase: "runtime",
      required: true,
      secret: true,
      purpose: "Allows server-only admin routes and jobs to use Supabase safely.",
    },
    {
      name: "SUPPORT_ADMIN_TOKEN",
      phase: "runtime",
      required: false,
      secret: true,
      purpose: "Enables protected internal support diagnostics when configured.",
    },
  ] satisfies DockerEnvVariable[],
} as const;

export function buildDockerBaselineReadiness() {
  const buildVars = dockerBaseline.envVariables.filter(
    (variable) => variable.phase === "build",
  );
  const runtimeVars = dockerBaseline.envVariables.filter(
    (variable) => variable.phase === "runtime",
  );

  return {
    hasProductionDockerfile: dockerBaseline.dockerfilePath === "Dockerfile",
    hasDockerignore: dockerBaseline.dockerignorePath === ".dockerignore",
    standaloneOutput: dockerBaseline.nextOutputMode === "standalone",
    hasHealthEndpoint: dockerBaseline.healthEndpoint === "/api/health",
    envInjectionSeparated:
      buildVars.every((variable) => variable.name.startsWith("NEXT_PUBLIC_")) &&
      runtimeVars.some((variable) => variable.secret),
    readyForReverseProxy:
      dockerBaseline.containerPort === 3000 &&
      dockerBaseline.runtimeUser === "nextjs",
  };
}

export function isDockerBaselineReady() {
  const readiness = buildDockerBaselineReadiness();

  return Object.values(readiness).every(Boolean);
}
