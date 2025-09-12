// Example usage of the generic BetterFeature typing system

import { betterFeature } from "../feature";
import type { BetterFeatureOptions } from "./options";
import type { BetterFeaturePlugin } from "./plugins";

// Example: Sequelize database type
interface SequelizeDatabase {
	models: {
		User: {
			create: (data: any) => Promise<any>;
			findOne: (options: any) => Promise<any>;
			findAll: (options: any) => Promise<any>;
			update: (data: any, options: any) => Promise<any>;
			destroy: (options: any) => Promise<any>;
		};
		Session: {
			create: (data: any) => Promise<any>;
			findOne: (options: any) => Promise<any>;
			findAll: (options: any) => Promise<any>;
			update: (data: any, options: any) => Promise<any>;
			destroy: (options: any) => Promise<any>;
		};
	};
	transaction: () => Promise<any>;
}

// Example: Custom plugin with typed database access
const customPlugin = (): BetterFeaturePlugin<SequelizeDatabase> => ({
	id: "custom-plugin",
	init: (ctx) => {
		// Now ctx.options.database is properly typed as SequelizeDatabase
		const db = ctx.options.database;

		if (db && "models" in db) {
			// You can access typed models without casting
			const userModel = db.models.User;
			const sessionModel = db.models.Session;
		}

		return {};
	},
	schema: {
		user: {
			fields: {
				email: {
					type: "string",
					required: true,
				},
				name: {
					type: "string",
					required: true,
				},
			},
		},
	},
});

// Example: Using the generic betterFeature function
export const createTypedFeature = (sequelizeDb: SequelizeDatabase) => {
	return betterFeature<SequelizeDatabase>({
		appName: "Typed Better Feature",
		database: sequelizeDb, // This is now typed as SequelizeDatabase
		plugins: [customPlugin()],
		databaseHooks: {
			user: {
				create: {
					before: async (data, ctx) => {
						// ctx is typed with SequelizeDatabase
						const db = ctx?.context.options.database;
						if (db && "models" in db) {
							// You can use the typed database here
							await db.models.User.create(data);
						}
					},
					after: async (data, ctx) => {
						const db = ctx?.context.options.database;
						if (db && "models" in db) {
							// Access typed models
							const user = await db.models.User.findOne({
								where: { id: data.id },
							});
						}
					},
				},
			},
		},
	});
};

// Example: Another database type (MongoDB)
interface MongoDBDatabase {
	collection: (name: string) => {
		insertOne: (doc: any) => Promise<any>;
		findOne: (filter: any) => Promise<any>;
		find: (filter: any) => Promise<any>;
		updateOne: (filter: any, update: any) => Promise<any>;
		deleteOne: (filter: any) => Promise<any>;
	};
}

const mongoPlugin = (): BetterFeaturePlugin<MongoDBDatabase> => ({
	id: "mongo-plugin",
	init: (ctx) => {
		const db = ctx.options.database;

		if (db && "collection" in db) {
			const userCollection = db.collection("users");
		}

		return {};
	},
	schema: {
		user: {
			fields: {
				email: {
					type: "string",
					required: true,
				},
			},
		},
	},
});

export const createMongoFeatureWithPlugin = (mongoDb: MongoDBDatabase) => {
	return betterFeature<MongoDBDatabase>({
		appName: "MongoDB Better Feature",
		database: mongoDb,
		plugins: [mongoPlugin()],
	});
};

// Example: Union type for multiple database support
type SupportedDatabase = SequelizeDatabase | MongoDBDatabase;

const universalPlugin = (): BetterFeaturePlugin<SupportedDatabase> => ({
	id: "universal-plugin",
	init: (ctx) => {
		const db = ctx.options.database;

		// Type guard to check database type
		if (db && "models" in db) {
			// It's Sequelize
			const sequelizeDb = db as SequelizeDatabase;
			const userModel = sequelizeDb.models.User;
		} else if (db && "collection" in db) {
			// It's MongoDB
			const mongoDb = db as MongoDBDatabase;
			const userCollection = mongoDb.collection("users");
		}

		return {};
	},
});

export const createUniversalFeature = (db: SupportedDatabase) => {
	return betterFeature<SupportedDatabase>({
		appName: "Universal Better Feature",
		database: db,
		plugins: [universalPlugin()],
	});
};
