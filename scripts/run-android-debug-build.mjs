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

const child = spawn("./gradlew", ["assembleDebug", "--no-daemon", "--console=plain"], {
  cwd: "android",
  env: process.env,
});

child.stdout.on("data", (chunk) => writeFiltered(chunk, process.stdout));
child.stderr.on("data", (chunk) => writeFiltered(chunk, process.stderr));

child.on("close", (code) => {
  process.exit(code ?? 1);
});
