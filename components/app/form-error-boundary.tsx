'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallbackTitle: string;
};

type State = {
  error: Error | null;
};

/**
 * Catches render-time errors inside the document/catalog form. Functional
 * components can't implement `componentDidCatch`, so this is a class. Keeps
 * the rest of the page mounted (header, breadcrumb, layout) and surfaces
 * the error as an inline alert instead of a whole-page crash.
 */
export class FormErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('FormErrorBoundary caught', error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>{this.props.fallbackTitle}</AlertTitle>
          <AlertDescription>{this.state.error.message}</AlertDescription>
        </Alert>
      );
    }
    return this.props.children;
  }
}
