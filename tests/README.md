# Test Scripts

This folder contains test scripts for debugging and testing individual action components.

## Running Tests

Since the project uses ES modules, you can run test scripts directly with Node.js:

```powershell
node tests\ensure-security-group.js
node tests\create-power-platform-environment.js
node tests\ensure-entraid-app-registration.js
node tests\ensure-entraid-tenant.js
node tests\ensure-environment-api-connection.js
node tests\ensure-maker.js
node tests\ensure-power-platform-environment.js
node tests\ensure-repo-env-app-registration.js
node tests\ensure-business-application-platform.js
node tests\test-configuration.js
```

## Prerequisites

Before running tests, ensure you have:

1. Created a `.testinput` folder in the project root
2. Added required test input files:
   - `authenticate-cicd-serviceprincipal.json` - Contains authentication credentials
   - `acctorg-private-key.pem` - Private key for encryption/decryption
   - Action-specific JSON files (e.g., `ensure-security-group.json`, `create-power-platform-environment.json`)

## Test Input Structure

The test scripts import configuration from `.testinput` folder files. These files should contain the necessary credentials and test data for each action being tested.

**Note**: The `.testinput` folder and its contents should never be committed to the repository as they contain sensitive credentials.
