export function GettingStartedSection() {
  return (
    <>
      <h3 className="mt-8">Getting Started</h3>
      <div className="bg-gray-50 border rounded-lg p-6 mt-4">
        <ol className="space-y-3">
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              1
            </span>
            <span>Choose your integration from the detailed guides above</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              2
            </span>
            <span>Follow the step-by-step setup instructions</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              3
            </span>
            <span>Test your connection with sample data</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              4
            </span>
            <span>Configure sync settings and go live</span>
          </li>
        </ol>
      </div>
    </>
  );
}
