import { Component, ReactNode } from 'react';
import { ErrorFallback } from '../components/error-fallback';

interface Props {
  children: ReactNode;
}

interface State {
  error: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          message={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
