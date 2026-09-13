import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last-resort safety net: without this, any uncaught render error anywhere
 * in the tree unmounts the whole app to a blank white screen with no nav
 * (React's default behavior, and this app has no route-level recovery).
 * Catches that and offers a way back instead of a dead end.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error('[KineTrack] Uncaught render error:', error, info.componentStack);
  }

  private handleReload = () => {
    // Full reload (not just resetting state) — some errors leave stale data
    // in memory that would just throw again on the next render.
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-lg font-bold text-gray-900 mb-2">Ocurrió un error inesperado</p>
          <p className="text-sm text-gray-600 mb-6 max-w-sm">
            La pantalla no pudo mostrarse correctamente. Lo que ya guardaste no se perdió — volvé al inicio para seguir trabajando.
          </p>
          <button
            onClick={this.handleReload}
            className="min-h-[56px] px-6 rounded-xl font-semibold bg-blue-600 text-white active:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
