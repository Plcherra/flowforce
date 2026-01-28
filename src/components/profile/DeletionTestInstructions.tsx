export default function DeletionTestInstructions() {
  return (
    <div className="text-xs text-gray-600 space-y-1">
      <p>
        <strong>Note:</strong> To test this properly:
      </p>
      <p>1. Create a test account and note the credentials</p>
      <p>2. Delete that account using the Delete Account button</p>
      <p>3. Run these tests with those credentials</p>
      <p>4. All tests should pass, indicating proper deletion</p>
    </div>
  );
}
