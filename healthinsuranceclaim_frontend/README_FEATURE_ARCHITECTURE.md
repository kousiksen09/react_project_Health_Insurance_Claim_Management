# Feature-Based Architecture Frontend

This React TypeScript application follows a **feature-based architecture** for better scalability and maintainability.

## Architecture Overview

```
src/
├── features/           # Feature-driven folders
│   ├── auth/          # Authentication feature
│   ├── dashboard/     # Dashboard feature  
│   └── claims/        # Claims management feature
├── shared/            # Reusable/shared code
│   ├── components/    # Common UI components
│   ├── hooks/         # Shared React hooks
│   ├── services/      # API clients and utilities
│   ├── types/         # Global TypeScript types
│   └── utils/         # Constants and helper functions
└── app/               # Application configuration
    ├── providers/     # Context providers and theme
    └── router/        # Route configuration
```

## Features

### 🔐 Auth Feature
- **Components**: LoginForm, RegisterForm
- **Hooks**: useLogin, useRegister  
- **Services**: authApi
- **Types**: LoginRequest, AuthResponse

### 📊 Dashboard Feature
- **Components**: DashboardPage, StatCard
- **Hooks**: useDashboard
- **Types**: DashboardStats

### 📋 Claims Feature
- **Components**: ClaimsPage, ClaimsList
- **Services**: claimsApi
- **Types**: CreateClaimRequest, ProcessClaimRequest

### 🔄 Shared Resources
- **Components**: Layout, LoadingSpinner
- **Hooks**: useAuth
- **Services**: apiClient
- **Types**: User, Claim, UserRole, ClaimStatus

## Key Benefits

1. **Feature Isolation**: Each feature is self-contained
2. **Scalability**: Easy to add new features
3. **Team Collaboration**: Clear ownership boundaries
4. **Reusability**: Shared components and utilities
5. **Maintainability**: Clear separation of concerns

## Usage Examples

### Adding a New Feature
```typescript
// 1. Create feature folder structure
src/features/notifications/
├── components/
├── hooks/
├── services/
├── types/
└── index.ts

// 2. Export from index.ts
export { NotificationsList } from './components/NotificationsList';
export { useNotifications } from './hooks/useNotifications';
```

### Using Shared Resources
```typescript
// Import from shared
import { useAuth } from '../../shared/hooks/useAuth';
import { apiClient } from '../../shared/services/apiClient';
import { User } from '../../shared/types';

// Import from features
import { LoginForm } from '../../features/auth';
import { DashboardPage } from '../../features/dashboard';
```

## Development Guidelines

1. **Feature Independence**: Features should not directly import from other features
2. **Shared First**: Common functionality goes in shared/
3. **Clear Exports**: Each feature exports through index.ts
4. **Type Safety**: Use TypeScript interfaces for all data structures
5. **Consistent Naming**: Follow established naming conventions

## Getting Started

```bash
npm install --legacy-peer-deps
npm run dev
```

The application will start on `http://localhost:5173` with the backend API expected at `https://localhost:7297/api`.