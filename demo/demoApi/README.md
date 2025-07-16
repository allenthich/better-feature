# Better Feature API with Sequelize Integration

This is a demonstration API application that shows how to integrate Better Feature with Sequelize and automatically generate migration files from plugins.

## Project Structure

```
demo/demoApi/
├── feature.ts           # Main Better Feature configuration
├── migrations/          # Auto-generated migration files from plugins
│   ├── 20240927084921-create-user.js
│   ├── 20240929084921-create-categories.js
│   └── 20240929084933-newPlugin.js
├── config/
│   └── config.json      # Sequelize CLI configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
npm install better-feature sequelize mysql2
```

### 2. Configure Database

Update your database configuration in `feature.ts`:

```typescript
const sequelize = new Sequelize("your_database", "username", "password", {
  host: "localhost",
  port: 3306,
  dialect: "mysql", // or "postgres", "sqlite", etc.
  logging: false,
});
```

### 3. Configure Better Feature with Plugins

```typescript
import { betterFeature } from "better-feature";
import { sequelizeAdapter } from "better-feature/adapters/sequelize";
import { membershipLoginPlugin } from "../demoPlugin/src/index";
import { myNewPlugin } from "../myplugin/src/index";

export const feature = betterFeature({
  basePath: "/api",
  database: sequelizeAdapter(sequelize, {
    provider: "mysql",
  }),
  plugins: [
    membershipLoginPlugin(),
    myNewPlugin(),
    // Add more plugins as needed
  ],
});
```

## Using Plugin Migrations

### How It Works

The Better Feature CLI automatically discovers and copies migration files from your plugins:

1. **Plugins provide migration paths** - Each plugin declares its migration file locations
2. **CLI discovers migrations** - Automatically finds migration files from all registered plugins
3. **Files are copied** - Migration files are copied to your API's `migrations/` directory
4. **Ready for Sequelize** - Files are ready to be executed by Sequelize CLI

### Generate Migrations from Plugins

#### Method 1: Using a separate config file (Recommended)

Create a migration-specific config file to avoid server startup issues:

```typescript
// migration-config.ts
import { betterFeature } from "better-feature";
import { sequelizeAdapter } from "better-feature/adapters/sequelize";
import { membershipLoginPlugin } from "../demoPlugin/src/index";
import { myNewPlugin } from "../myplugin/src/index";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize("better_auth_test", "root", "password", {
  host: "localhost",
  port: 3306,
  dialect: "mysql",
  logging: false,
});

export const feature = betterFeature({
  basePath: "/api",
  database: sequelizeAdapter(sequelize, {
    provider: "mysql",
  }),
  plugins: [membershipLoginPlugin(), myNewPlugin()],
});
```

Run the CLI:

```bash
npx @better-feature/cli generate --config migration-config.ts -y
```

#### Method 2: One-liner command

```bash
cd your-api-directory

# Create temporary config and run CLI
echo 'import { betterFeature } from "better-feature";
import { sequelizeAdapter } from "better-feature/adapters/sequelize";
import { membershipLoginPlugin } from "../demoPlugin/src/index";
import { myNewPlugin } from "../myplugin/src/index";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize("better_auth_test", "root", "password", {
  host: "localhost", port: 3306, dialect: "mysql", logging: false,
});

export const feature = betterFeature({
  basePath: "/api",
  database: sequelizeAdapter(sequelize, { provider: "mysql" }),
  plugins: [membershipLoginPlugin(), myNewPlugin()],
});' > temp-config.ts

# Run CLI
npx @better-feature/cli generate --config temp-config.ts -y

# Clean up
rm temp-config.ts
```

### Expected Output

When you run the CLI, you'll see:

```
✓ Processing plugin: membership
✓ Processing plugin: myNewPlugin
✓ Found 2 plugin migration(s) to copy...
✓ Copied migration: 20240927084921-create-user.js from membership
✓ Copied migration: 20240929084933-newPlugin.js from myNewPlugin
🚀 Plugin migrations copied successfully!
```

## Running Migrations

### Using Sequelize CLI

1. **Install Sequelize CLI**:
   ```bash
   npm install -g sequelize-cli
   ```

2. **Configure Sequelize CLI** (`config/config.json`):
   ```json
   {
     "development": {
       "username": "root",
       "password": "password",
       "database": "better_auth_test",
       "host": "127.0.0.1",
       "dialect": "mysql"
     }
   }
   ```

3. **Run migrations**:
   ```bash
   npx sequelize-cli db:migrate
   ```

4. **Check migration status**:
   ```bash
   npx sequelize-cli db:migrate:status
   ```

### Manual Migration Execution

You can also run migrations programmatically:

```typescript
import { Sequelize } from "sequelize";
import { Umzug, SequelizeStorage } from "umzug";
import path from "path";

const sequelize = new Sequelize(/* your config */);

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, "migrations", "*.js"),
    resolve: ({ name, path }) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const migration = require(path);
      return {
        name,
        up: async () => migration.up(sequelize.getQueryInterface(), Sequelize),
        down: async () => migration.down(sequelize.getQueryInterface(), Sequelize),
      };
    },
  },
  storage: new SequelizeStorage({ sequelize }),
});

// Run migrations
await umzug.up();
```

## API Features

### ✅ Plugin Integration
- Simple plugin registration in configuration
- Automatic migration discovery from plugins
- No conflicts between plugin migrations

### ✅ Sequelize Integration
- Full Sequelize ORM support
- Automatic migration file generation
- Support for all Sequelize dialects

### ✅ Database Hooks
- Pre/post database operation hooks
- Access to typed database models
- Custom business logic integration

### ✅ Express Integration
- Easy Express.js integration
- Automatic API endpoint registration
- Built-in middleware support

## Development Workflow

1. **Install plugins** from npm or create local plugins
2. **Add plugins** to your `feature.ts` configuration
3. **Generate migrations** using the CLI
4. **Run migrations** using Sequelize CLI
5. **Start your application** with the migrated database

## Adding New Plugins

### 1. Install Plugin
```bash
npm install @your-org/your-plugin
```

### 2. Add to Configuration
```typescript
import { yourNewPlugin } from "@your-org/your-plugin";

export const feature = betterFeature({
  plugins: [
    membershipLoginPlugin(),
    yourNewPlugin(), // 👈 Add here
  ],
});
```

### 3. Generate and Run Migrations
```bash
# Generate migrations from all plugins
npx @better-feature/cli generate --config migration-config.ts -y

# Run migrations
npx sequelize-cli db:migrate
```

> **Note**: For creating your own plugins, see the [Plugin Development Guide](../demoPlugin/README.md)

## Common Commands

```bash
# Generate migrations from all plugins
npx @better-feature/cli generate -y

# Run pending migrations
npx sequelize-cli db:migrate

# Rollback last migration
npx sequelize-cli db:migrate:undo

# Check migration status
npx sequelize-cli db:migrate:status

# Create new migration manually
npx sequelize-cli migration:generate --name your-migration-name
```

## Database Hooks Example

```typescript
export const feature = betterFeature({
  // ... other config
  databaseHooks: {
    user: {
      create: {
        before: async (data, ctx) => {
          // Validation, logging, etc.
          console.log("Before creating user:", data);
        },
        after: async (data, ctx) => {
          // Send welcome email, audit log, etc.
          console.log("User created:", data);
        },
      },
    },
  },
});
```

## Troubleshooting

### Database Connection Issues
- Check database credentials in `feature.ts`
- Ensure database server is running
- Verify network connectivity
- Check `config/config.json` for Sequelize CLI

### Migration Issues
- Ensure plugins are properly imported
- Check plugin IDs are unique
- Verify migration files are in correct format
- Review migration file naming convention

### CLI Not Finding Plugins
- Ensure plugins are properly imported in your config file
- Check that plugins export `migrationPaths` property
- Verify plugin returns valid `BetterFeaturePlugin` object

## Best Practices

### API Development
- ✅ Use separate databases for dev/test/prod
- ✅ Always review generated migrations before running
- ✅ Test migrations in development environment first
- ✅ Keep migrations in version control

### Plugin Management
- ✅ Group related plugins together
- ✅ Use consistent naming conventions
- ✅ Document plugin dependencies
- ✅ Version your plugins properly

### Production Setup
- ✅ Automate migration running in CI/CD
- ✅ Monitor migration performance
- ✅ Have rollback procedures ready
- ✅ Use connection pooling for production
