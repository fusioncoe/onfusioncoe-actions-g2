# OnFusionCoE Actions G2

A collection of GitHub Actions that enable secure, customer-controlled automation of Microsoft Power Platform and Entra ID resources as part of the OnFusionCoE DevOps-as-a-Service offering.

## Overview

OnFusionCoE is a DevOps-as-a-Service platform offered by FusionCoE that provides automated Power Platform lifecycle management while maintaining strict security and customer data sovereignty. This repository contains the GitHub Actions that serve as secure proxies between the OnFusionCoE service and customer Microsoft cloud resources.

## Architecture

### Security-First Design

The OnFusionCoE architecture follows a zero-trust security model where customer credentials are never exposed to the service:

```text
┌─────────────────────────────────────────────────────────────┐
│ Customer GitHub Account                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Service Admin Repository                                │ │
│ │ • Environment Variables & Secrets (Customer Controlled)│ │
│ │ • GitHub Actions Workflows                             │ │
│ │ • OnFusionCoE Actions (This Repo)                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Workflow Dispatch
                              │ (via GitHub App)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ OnFusionCoE Service                                         │
│ • Orchestrates workflows                                    │
│ • Never sees customer credentials                          │
│ • Sends encrypted payloads                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Secure API Calls
                              │ (using customer credentials)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Microsoft Cloud Resources                                   │
│ • Entra ID (Azure AD)                                      │
│ • Power Platform                                           │
│ • Microsoft Graph API                                      │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Customer Control**: All sensitive credentials remain in the customer's GitHub environment
2. **Service Isolation**: OnFusionCoE service orchestrates without accessing secrets
3. **Secure Proxy**: GitHub Actions serve as authenticated proxies for Microsoft cloud operations
4. **Audit Trail**: Complete operation history in customer's GitHub Actions runs
5. **Revocable Access**: Customer maintains full control over permissions and access

## Available Actions

This repository provides the following GitHub Actions:

### Power Platform Management

- **`create-power-platform-environment`** - Creates new Power Platform environments
- **`ensure-power-platform-environment`** - Ensures Power Platform environment exists with specified configuration
- **`ensure-environment-api-connection`** - Manages API connections within environments

### Entra ID (Azure AD) Management

- **`ensure-entraid-app-registration`** - Manages Entra ID application registrations
- **`ensure-entraid-tenant`** - Ensures tenant configuration and settings
- **`ensure-repo-env-app-registration`** - Links repository environments to app registrations
- **`ensure-security-group`** - Manages Entra ID security groups

### User and Access Management

- **`ensure-maker`** - Manages Power Platform maker permissions
- **`ensure-business-application-platform`** - Configures business application platforms

### Workflow and Testing

- **`process-service-repo-dispatch`** - Processes service repository dispatch events
- **`test-authentication`** - Validates authentication configuration
- **`test-configuration`** - Tests action configuration and connectivity

## Core Features

### FsnxApiClient

The heart of all actions is the `FsnxApiClient` class, which provides:

- **Multi-Scope Authentication**: Handles OAuth2 with Microsoft Graph and Power Platform APIs
- **Token Caching**: Efficiently caches authentication tokens per scope
- **Event Processing**: Processes encrypted webhook payloads from the OnFusionCoE service
- **Step-Based Execution**: Conditional execution based on workflow steps
- **Secure Communication**: Encrypts/decrypts sensitive data using libsodium

### Security Features

- **Client Credential Flow**: Uses Azure AD application credentials for authentication
- **Scope-Based Access**: Fine-grained permissions per operation
- **Encrypted Payloads**: Sensitive data encrypted in transit
- **No Credential Exposure**: Service never accesses customer secrets

## Usage

These actions are designed to be called via workflow dispatch events initiated by the OnFusionCoE service. They are not intended for direct manual execution.

### Prerequisites

1. OnFusionCoE GitHub App installed in customer account
2. Service admin repository configured with required environment variables and secrets
3. Entra ID application registration with appropriate permissions

### Required Inputs

All actions require these common inputs:

- `client_id`: Entra ID application ID
- `client_secret`: Application client secret (stored in GitHub secrets)
- `tenant_id`: Azure/Entra ID tenant ID
- `authority`: Microsoft authentication authority (default: `https://login.microsoftonline.com/`)
- `event_path`: Path to the webhook event payload file

## Development

### Development Prerequisites

- **Node.js**: v18 or higher (tested with v24.11.0)
- **npm**: v8 or higher

### Build System

The repository uses **Gulp** exclusively for building all actions:

```bash
npm install
npm run build
```

This will:

- Build all individual actions into the `dist/actions/[action-name]/` folders
- Bundle each action using esbuild for optimal performance
- Create CommonJS packages for GitHub Actions runtime compatibility

### Project Structure

```text
├── src/
│   ├── index.js                 # Main action entry point
│   ├── lib/
│   │   └── FsnxApiClient.js     # Core API client
│   └── actions/
│       ├── create-power-platform-environment/
│       ├── ensure-entraid-app-registration/
│       └── ...                  # Individual action implementations
├── tests/                       # Test files for each action
├── dist/                        # Built actions for distribution
└── [action-name]/
    └── action.yml              # Action definitions
```

### Dependencies

- **@azure/identity** & **@azure/msal-node**: Microsoft authentication
- **@microsoft/microsoft-graph-client**: Microsoft Graph API client
- **@actions/core** & **@actions/github**: GitHub Actions framework
- **libsodium-wrappers**: Encryption/decryption functionality

## Contributing

This repository is part of the OnFusionCoE service infrastructure. For support or feature requests, please contact FusionCoE through your service agreement channels.

## License

ISC License - See package.json for details.

---

**OnFusionCoE** - Secure, customer-controlled Power Platform DevOps automation
