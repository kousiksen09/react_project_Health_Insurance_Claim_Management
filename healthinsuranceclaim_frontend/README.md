# Health Insurance Claims Frontend

A modern React TypeScript frontend application for managing health insurance claims, built with Material UI and clean architecture principles.

## Features

- **Role-based Authentication**: Support for Customer, Hospital, Claim Officer, and Admin roles
- **Claims Management**: Create, view, and process insurance claims
- **Dashboard**: Role-specific dashboards with statistics and recent activity
- **Material UI**: Modern, responsive design with Material Design components
- **Clean Architecture**: Organized codebase with separation of concerns

## Tech Stack

- **React 19** with TypeScript
- **Material UI v6** for UI components
- **React Router** for navigation
- **React Hook Form** with Yup validation
- **Axios** for API communication
- **Vite** for build tooling

## Project Structure

```
src/
├── core/                    # Business logic layer
│   ├── entities/           # Domain entities
│   ├── interfaces/         # Contracts and interfaces
│   └── usecases/          # Business use cases
├── infrastructure/         # External services layer
│   ├── api/               # API clients
│   └── storage/           # Local storage services
├── presentation/          # UI layer
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   ├── layouts/          # Layout components
│   └── hooks/            # Custom React hooks
└── shared/               # Shared utilities
    ├── constants/        # Application constants
    ├── types/           # TypeScript type definitions
    └── utils/           # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on `https://localhost:7297`

### Installation

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## User Roles & Features

### Customer
- View personal dashboard with claim statistics
- View and track personal claims
- Register for new account

### Hospital
- View dashboard with hospital-related claims
- Access all claims related to the hospital
- Register hospital account

### Claim Officer
- Process pending claims (approve/reject)
- View all claims in the system
- Access pending claims queue

### Admin
- Full system access
- View all claims and statistics
- Manage users and hospitals

## API Integration

The frontend communicates with the backend API at `https://localhost:7297/api`. Key endpoints:

- `POST /auth/login` - User authentication
- `POST /auth/register/customer` - Customer registration
- `POST /auth/register/hospital` - Hospital registration
- `GET /claims` - Get all claims (role-based)
- `GET /claims/my-claims` - Get customer's claims
- `GET /claims/pending` - Get pending claims
- `PUT /claims/{id}/process` - Process a claim

## Configuration

Update the API base URL in `src/shared/constants/index.ts`:

```typescript
export const API_BASE_URL = 'https://localhost:7297/api';
```

## Authentication

The application uses JWT tokens for authentication:
- Tokens are stored in localStorage
- Automatic token refresh on API calls
- Role-based route protection
- Automatic logout on token expiration

## Material UI Theme

The application uses a custom Material UI theme defined in `App.tsx`. You can customize colors, typography, and other design tokens there.

## Contributing

1. Follow the clean architecture principles
2. Use TypeScript for type safety
3. Follow Material UI design guidelines
4. Write reusable components
5. Implement proper error handling