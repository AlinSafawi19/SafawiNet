'use client';

import { useState } from 'react';
import { logError, logWarning, logInfo } from '../utils/errorLogger';

export const LoggingExample: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  const testError = () => {
    try {
      throw new Error('This is a test error for logging');
    } catch (error) {
      logError(
        'Test error occurred',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'LoggingExample',
          action: 'testError',
          metadata: { test: true }
        }
      );
    }
  };

  const testWarning = () => {
    logWarning('This is a test warning', {
      component: 'LoggingExample',
      action: 'testWarning',
      metadata: { test: true }
    });
  };

  const testInfo = () => {
    logInfo('This is a test info message', {
      component: 'LoggingExample',
      action: 'testInfo',
      metadata: { test: true }
    });
  };

  const toggleLogging = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    // This would typically be done through the logger service
    localStorage.setItem('debug-logging', newState.toString());
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Logging System Test</h3>
      <div className="space-y-2">
        <button
          onClick={testError}
          className="bg-red-500 text-white px-4 py-2 rounded mr-2"
        >
          Test Error
        </button>
        <button
          onClick={testWarning}
          className="bg-yellow-500 text-white px-4 py-2 rounded mr-2"
        >
          Test Warning
        </button>
        <button
          onClick={testInfo}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Test Info
        </button>
        <button
          onClick={toggleLogging}
          className={`px-4 py-2 rounded ${
            isEnabled ? 'bg-green-500' : 'bg-gray-500'
          } text-white`}
        >
          {isEnabled ? 'Disable' : 'Enable'} Logging
        </button>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Check the browser console and server logs to see the logged messages.
      </p>
    </div>
  );
};
