# Sequelize Adapter

The Sequelize adapter allows you to use [Sequelize](https://sequelize.org/) as your database ORM with Better Feature.

## Installation

```bash
npm install sequelize
# Also install your database driver
npm install mysql2  # For MySQL/MariaDB
npm install pg       # For PostgreSQL
npm install sqlite3  # For SQLite
npm install tedious  # For SQL Server
```

## Usage

```typescript
import { betterFeature } from "better-feature";
import { sequelizeAdapter } from "better-feature/adapters/sequelize";
import { Sequelize } from "sequelize";

// Configure your Sequelize instance
const sequelize = new Sequelize("database", "username", "password", {
  host: "localhost",
  dialect: "mysql", // 'mysql' | 'postgres' | 'sqlite' | 'mssql'
  logging: false,
});

export const auth = betterFeature({
  database: sequelizeAdapter(sequelize, {
    provider: "mysql", // Must match your Sequelize dialect
    usePlural: false,  // Use plural table names (optional)
  }),
  // ... other options
});
```

## Configuration Options

### SequelizeConfig

- `provider`: Database provider type ("sqlite" | "cockroachdb" | "mysql" | "postgresql" | "sqlserver" | "mongodb")
- `usePlural?`: Whether to use plural table names (default: false)
- `debugLogs?`: Enable debug logging for the adapter

## Database Setup

After configuring the adapter, you need to create the database schema. You can use the Better Feature CLI:

```bash
npx @better-auth/cli generate
```

This will generate the necessary Sequelize migration files. Then run the migrations:

```bash
npx sequelize-cli db:migrate
```

## Supported Operations

The Sequelize adapter supports all standard Better Feature database operations:

- `create`: Create new records
- `findOne`: Find a single record
- `findMany`: Find multiple records with pagination and sorting
- `count`: Count records
- `update`: Update a single record
- `updateMany`: Update multiple records
- `delete`: Delete a single record
- `deleteMany`: Delete multiple records

## Query Operators

The adapter supports the following query operators:

- `eq`: Equal (default)
- `ne`: Not equal
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `starts_with`: String starts with
- `ends_with`: String ends with
- `contains`: String contains (using LIKE)
- `in`: Value in array
- `notIn`: Value not in array

## Example Models

Here's an example of how to define models that work with Better Feature:

```typescript
import { DataTypes } from "sequelize";

// User model
const User = sequelize.define("User", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  name: DataTypes.STRING,
  emailVerified: DataTypes.BOOLEAN,
  image: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

// Session model
const Session = sequelize.define("Session", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: User,
      key: "id",
    },
  },
  expiresAt: DataTypes.DATE,
  token: DataTypes.STRING,
  ipAddress: DataTypes.STRING,
  userAgent: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});
```

## Error Handling

The adapter includes proper error handling and will throw `BetterFeatureError` for common issues like missing models or database connection problems.