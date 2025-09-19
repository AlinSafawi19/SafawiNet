'use client';

import { LoggingExample } from '../components/LoggingExample';

export default function TestLoggingPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Logging System Test Page</h1>
      <LoggingExample />
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">How to Test:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click the test buttons to generate different types of logs</li>
          <li>Check the browser console to see client-side logs</li>
          <li>Check the server logs in <code>server/api/logs/</code> directory</li>
          <li>Enable/disable logging to test the toggle functionality</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Log Files Location:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Server logs:</strong> <code>server/api/logs/application-YYYY-MM-DD.log</code></li>
          <li><strong>Error logs:</strong> <code>server/api/logs/errors-YYYY-MM-DD.log</code></li>
        </ul>
      </div>
    </div>
  );
}
