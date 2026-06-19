# Health Insurance Claim Management System

A comprehensive health insurance claim management platform built with React 19 (TypeScript) frontend and .NET Core backend.

## Features

- **Multi-role Authentication**: Customer, Hospital, Claim Officer, and Admin roles
- **Policy Management**: Create, purchase, and manage insurance policies
- **Claim Processing**: End-to-end claim submission and processing workflow
- **Document Management**: Secure file upload and document handling
- **Real-time Notifications**: Status updates and alerts for all stakeholders
- **Dashboard Analytics**: Role-specific dashboards with key metrics
- **Payment Processing**: Integrated payment handling for policies and claims

## Tech Stack

### Frontend
- **React 19.2.0** with TypeScript
- **Material-UI 6.1.6** for UI components
- **React Router 6.28.0** for navigation
- **React Hook Form 7.53.2** for form management
- **Axios 1.7.7** for API communication
- **Vite 7.2.2** as build tool

### Backend
- **.NET Core** Web API
- **Entity Framework Core** for data access
- **JWT Authentication** for security
- **SQL Server** database
- **AutoMapper** for object mapping
- **File Upload** handling

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- .NET 8 SDK
- SQL Server

### Frontend Setup
```bash
cd healthinsuranceclaim_frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd HealthInsuranceClaimAPI
dotnet restore
dotnet run
```

## Project Structure

```
HealthInsuranceClaim/
├── healthinsuranceclaim_frontend/     # React TypeScript frontend
│   ├── src/
│   │   ├── features/                  # Feature-based modules
│   │   ├── shared/                    # Shared components and utilities
│   │   └── app/                       # App configuration and routing
│   └── package.json
├── HealthInsuranceClaimAPI/           # .NET Core backend
│   ├── Controllers/                   # API controllers
│   ├── Services/                      # Business logic
│   ├── Models/                        # Data models
│   ├── DTOs/                          # Data transfer objects
│   └── Data/                          # Database context
└── README.md
```

## User Roles

1. **Customer**: Register, purchase policies, track claims
2. **Hospital**: Submit claims, upload documents, manage patient claims
3. **Claim Officer**: Review and process claims, approve/reject claims
4. **Administrator**: Manage users, policies, and system configuration

## API Endpoints

- **Authentication**: `/api/auth/*`
- **Customer**: `/api/customer/*`
- **Hospital**: `/api/hospital/*`
- **Claim Officer**: `/api/claimofficer/*`
- **Admin**: `/api/admin/*`
- **Claims**: `/api/claims/*`
- **Policies**: `/api/policies/*`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.