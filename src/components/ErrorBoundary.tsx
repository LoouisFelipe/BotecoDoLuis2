import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  let errorMessage = 'An unexpected error occurred.';
  try {
    if (error?.message) {
      const parsed = JSON.parse(error.message);
      if (parsed.error) {
        errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
      }
    }
  } catch {
    errorMessage = error?.message || errorMessage;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-md w-full border-destructive/50 shadow-lg">
        <CardHeader className="text-destructive flex flex-row items-center gap-2">
          <AlertCircle className="w-6 h-6" />
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground break-words">
            {errorMessage}
          </p>
          <Button 
            onClick={() => {
              resetErrorBoundary();
              window.location.reload();
            }}
            variant="outline" 
            className="w-full gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
