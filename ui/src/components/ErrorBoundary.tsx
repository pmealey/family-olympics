import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Card, CardBody, Button } from './';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ice-blue p-4">
          <Card className="max-w-md w-full">
            <CardBody>
              <div className="text-center space-y-4">
                <div className="text-6xl">❄️</div>
                <h2 className="text-2xl font-display font-bold text-winter-dark">
                  Oops! Something went wrong
                </h2>
                <p className="text-winter-gray">
                  We encountered an unexpected error. Don't worry, your data is safe!
                </p>
                {this.state.error && (
                  <details className="text-left">
                    <summary className="cursor-pointer text-sm text-winter-gray hover:text-winter-dark">
                      Technical details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
                <Button onClick={this.handleReset} variant="primary" fullWidth>
                  Return to Home
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

