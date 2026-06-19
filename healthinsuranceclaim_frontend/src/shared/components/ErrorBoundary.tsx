import { Component, type ReactNode } from 'react';
import { Alert, Box, Button } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Something went wrong. Please refresh the page or contact support.
            <Button onClick={() => window.location.reload()} sx={{ ml: 2 }}>
              Refresh Page
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}