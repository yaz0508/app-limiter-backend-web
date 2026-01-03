import { AlertCircle, RefreshCw, X } from "lucide-react";

interface ErrorDisplayProps {
  error: {
    message: string;
    retryable?: boolean;
    code?: string;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorDisplay = ({ error, onRetry, onDismiss, className = "" }: ErrorDisplayProps) => {
  const getErrorTitle = () => {
    switch (error.code) {
      case "NETWORK_ERROR":
        return "Connection Problem";
      case "AUTH_ERROR":
        return "Authentication Failed";
      case "VALIDATION_ERROR":
        return "Invalid Input";
      case "SERVER_ERROR":
        return "Server Error";
      case "NOT_FOUND":
        return "Not Found";
      case "FORBIDDEN":
        return "Access Denied";
      default:
        return "Something Went Wrong";
    }
  };

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-800 mb-1">{getErrorTitle()}</h3>
          <p className="text-sm text-red-700">{error.message}</p>
          {error.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-800 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

