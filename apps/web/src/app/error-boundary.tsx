import { Component, ReactNode } from 'react';
import { ErrorFallback } from '../components/error-fallback';

interface Props {
  children: ReactNode;
}

interface State {
  error: string | null;
  retryKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error: error.message };
  }

  handleRetry = () => {
    this.setState((current) => ({
      error: null,
      retryKey: current.retryKey + 1,
    }));
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          message={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }
    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}

export function Panel({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
