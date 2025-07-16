# Better Feature Plugin with Migrations

This is a demonstration plugin that shows how to create a Better Feature plugin with Sequelize migrations.

## Plugin Structure

```
demo/demoPlugin/
├── src/
│   ├── index.ts          # Main plugin definition
│   ├── client.ts         # Client-side plugin (optional)
│   ├── types.ts          # Type definitions
│   └── migrations/       # Database migration files
│       └── 20240927084921-create-user.js
├── package.json
├── tsconfig.json
└── README.md
```

## Creating a Plugin with Migrations

### 1. Plugin Definition

Your main plugin file should export a function that returns a `BetterFeaturePlugin`:

```typescript
import type { BetterFeaturePlugin } from "better-feature";
import { createTypedFeatureEndpoint } from "better-feature/api";
import path from "path";

export const membershipLoginPlugin = (): BetterFeaturePlugin<sequelizeDatabase> => {
  return {
    id: "membership",
    
    // 🔥 KEY FEATURE: Provide migration file paths
    migrationPaths: [
      path.join(__dirname, 'migrations', '20240927084921-create-user.js'),
      // Add more migration files as needed
    ],
    
    endpoints: {
      // Your API endpoints
      login: createTypedEndpoint(...),
    },
  };
};
```

### 2. Migration Files

Create Sequelize migration files in the `src/migrations/` directory:

```javascript
// src/migrations/20240927084921-create-user.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      fullName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      // ... more fields
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Users');
  },
};
```

### 3. Migration Naming Convention

Migration files must follow the Sequelize naming pattern:
- Format: `YYYYMMDDHHMMSS-description.js`
- Example: `20240927084921-create-user.js`

### 4. Package Configuration

Your `package.json` should be configured for TypeScript compilation:

```json
{
  "name": "@your-org/your-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "better-feature": "workspace:*",
    "sequelize": "^6.37.0"
  }
}
```

### 5. TypeScript Configuration

Create a `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Plugin Features

### ✅ Migration Path Declaration
- Plugins declare their migration file paths using `migrationPaths`
- No need for hardcoded paths in the CLI
- Works with any registry or local development

### ✅ Sequelize Model Integration
- Define Sequelize models that work with your migrations
- Full TypeScript support with typed database connections
- Automatic model registration

### ✅ API Endpoints
- Create typed endpoints using `createTypedFeatureEndpoint`
- Full database access with proper typing
- Built-in error handling and validation

### ✅ Client-Side Integration
- Optional client-side plugin for frontend frameworks
- Type-safe API calls
- Automatic inference of server plugin types

## Development Commands

```bash
# Build plugin
npm run build

# Watch for changes
npm run dev

# Type checking
npm run typecheck
```

## Best Practices

### Migration Files
- ✅ Use descriptive names: `20240927084921-create-user-table.js`
- ✅ Include both `up` and `down` migrations
- ✅ Use Sequelize data types and constraints
- ✅ Add indexes for performance-critical fields

### Plugin Structure
- ✅ Export a factory function that returns the plugin
- ✅ Use meaningful plugin IDs
- ✅ Provide TypeScript types for better DX
- ✅ Keep migrations separate from business logic

### Error Handling
- ✅ Validate input data in endpoints
- ✅ Handle database connection errors
- ✅ Provide meaningful error messages
- ✅ Use proper HTTP status codes

## Registry-Agnostic Design

This plugin will work with:
- ✅ **npm packages**: `npm install your-plugin`
- ✅ **Private registries**: Works with any npm-compatible registry
- ✅ **Local development**: Direct imports from file paths
- ✅ **Monorepo setups**: Workspace dependencies

## Publishing Your Plugin

### 1. Build your plugin
```bash
npm run build
```

### 2. Test locally
```bash
npm pack
```

### 3. Publish to registry
```bash
npm publish
```

## Example Plugin Usage

Once your plugin is created, it can be used in any Better Feature application:

```typescript
import { yourPlugin } from "@your-org/your-plugin";

export const feature = betterFeature({
  plugins: [yourPlugin()],
  // ... other config
});
```

The plugin's migrations will be automatically available to the Better Feature CLI for copying to applications.