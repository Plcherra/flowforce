import { spawn } from "node:child_process";

const filteredLinePatterns = [
  /^Note: Some input files use unchecked or unsafe operations\.$/,
  /^Note: .+ uses or overrides a deprecated API\.$/,
  /^Note: Recompile with -Xlint:(unchecked|deprecation) for details\.$/,
  /^\[Incubating\] Problems report is available at:/,
];

function writeFiltered(chunk, stream) {
  const lines = chunk.toString().split(/\r?\n/);

  for (const line of lines) {
    if (!line) continue;
    if (filteredLinePatterns.some((pattern) => pattern.test(line))) continue;
    stream.write(`${line}\n`);
  }
}

function runOnce() {
  return new Promise((resolve) => {
    let output = "";
    const child = spawn("./gradlew", ["assembleDebug", "--no-daemon", "--console=plain"], {
      cwd: "android",
      env: process.env,
    });
    const capture = (chunk, stream) => {
      output += chunk.toString();
      writeFiltered(chunk, stream);
    };
    child.stdout.on("data", (chunk) => capture(chunk, process.stdout));
    child.stderr.on("data", (chunk) => capture(chunk, process.stderr));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

const attempts = 4;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const { code, output } = await runOnce();
  const distributionMissing = code !== 0 && /HTTP response code: 50[234]/.test(output);
  if (!distributionMissing || attempt === attempts) {
    process.exit(code);
  }
  console.error(
    `Gradle distribution download returned a temporary error (attempt ${attempt} of ${attempts}). Retrying.`,
  );
  await new Promise((resolve) => setTimeout(resolve, 20000));
}
