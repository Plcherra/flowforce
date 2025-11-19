// file-test.ts
// Simple commit-test file. Run with: ts-node file-test.ts or compile and run with node.

export function add(a: number, b: number): number {
    return a + b;
}

export function multiply(a: number, b: number): number {
    return a * b;
}

// Very small test runner
type Test = { name: string; run: () => boolean };

const tests: Test[] = [
    { name: "add(1,2) === 3", run: () => add(1, 2) === 3 },
    { name: "add(-1,1) === 0", run: () => add(-1, 1) === 0 },
    { name: "multiply(2,3) === 6", run: () => multiply(2, 3) === 6 },
    { name: "multiply(0,5) === 0", run: () => multiply(0, 5) === 0 },
];

let passed = 0;
tests.forEach((t) => {
    try {
        const ok = t.run();
        if (ok) {
            console.log(`✓ ${t.name}`);
            passed++;
        } else {
            console.error(`✗ ${t.name}`);
        }
    } catch (err) {
        console.error(`✗ ${t.name} (error: ${String(err)})`);
    }
});

console.log(`${passed}/${tests.length} tests passed.`);

// Exit with non-zero code if any test failed (useful for CI/commit hooks)
if (passed !== tests.length) {
    process.exit(1);
}