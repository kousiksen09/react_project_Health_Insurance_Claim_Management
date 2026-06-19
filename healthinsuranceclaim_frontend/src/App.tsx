import { AppProviders } from './app/providers/AppProviders';
import { AppRoutes } from './app/router/AppRoutes';
import { GlobalErrorHandler } from './shared/components/GlobalErrorHandler';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRoutes />
        <GlobalErrorHandler />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App
