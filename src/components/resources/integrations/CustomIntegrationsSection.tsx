export function CustomIntegrationsSection() {
  return (
    <>
      <h3 className="mt-12">Custom Integrations</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
        <h4 className="font-semibold text-blue-900 mb-2">
          Need a Custom Integration?
        </h4>
        <p className="text-blue-800 mb-4">
          Use our REST API and webhooks to build your own connections. Our API
          documentation provides detailed examples and code samples.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-blue-900 mb-2">
              REST API Features
            </h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Full CRUD operations</li>
              <li>• Real-time data access</li>
              <li>• Comprehensive documentation</li>
              <li>• Rate limiting protection</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-blue-900 mb-2">
              Webhook Capabilities
            </h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Event-driven notifications</li>
              <li>• Secure signature verification</li>
              <li>• Automatic retry logic</li>
              <li>• Flexible payload formats</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
