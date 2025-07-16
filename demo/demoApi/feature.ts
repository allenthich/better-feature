// src/server.ts

import {
	betterFeature,
	type BetterFeaturePlugin,
	type FeatureContext,
	type GenericEndpointContext,
	type BetterFeatureOptions,
} from "better-feature";
import { sequelizeAdapter } from "better-feature/adapters/sequelize";

import { toNodeHandler } from "better-feature/node";
import express from "express";
import { Sequelize } from "sequelize";
import {
	defineUserModel,
	membershipLoginPlugin,
} from "../demoPlugin/src/index";

import { myNewPlugin, defineNewPluginModel } from "../myplugin/src/index"; // Import the new plugin

// change the dabase, user, password, host, port as needed
export const sequelize = new Sequelize("better_auth_test", "root", "toor", {
	host: "localhost",
	port: parseInt("3306"),
	dialect: "mysql",
	logging: false,
});

const User = defineUserModel(sequelize);
const db = sequelize as Sequelize & {
	models: {
		User: typeof User;
	};
};

export const feature = betterFeature<
	BetterFeatureOptions<typeof db>,
	typeof db
>({
	basePath: "/api",
	database: sequelizeAdapter(sequelize, {
		provider: "mysql",
	}),
	plugins: [membershipLoginPlugin(), myNewPlugin()],
	databaseHooks: {
		user: {
			create: {
				before: async (data, ctx) => {
					// Now ctx.context.adapter.pool is properly typed as TypedDatabase!
					const db = ctx?.context.adapter.pool;
					if (db) {
						// Full TypeScript support - no casting needed!
						console.log("Before creating user:", data);
						// You can access typed models directly
						const existingUser = await db.models.User.findOne({
							where: { membershipId: data.membershipId },
						});
						if (existingUser) {
							throw new Error("User already exists");
						}
					}
				},
				after: async (data, ctx) => {
					// Properly typed database access without casting
					const db = ctx?.context.adapter.pool;
					if (db) {
						// Access typed models with full IntelliSense
						const user = await db.models.User.findOne({
							where: { id: data.id },
						});
						console.log("User created:", user?.toJSON());

						// You can also access Sequelize instance methods
						const userCount = await db.models.User.count();
						console.log("Total users:", userCount);
					}
				},
			},
			update: {
				before: async (data, ctx) => {
					const db = ctx?.context.adapter.pool;
					if (db) {
						console.log("Before updating user:", data);
						// Typed access to User model methods
						const user = await db.models.User.findByPk(data.id);
						if (!user) {
							throw new Error("User not found");
						}
					}
				},
				after: async (data, ctx) => {
					const db = ctx?.context.adapter.pool;
					if (db) {
						// Full type safety for updated user
						const updatedUser = await db.models.User.findByPk(data.id);
						console.log("User updated:", updatedUser?.toJSON());
					}
				},
			},
		},
	},
	logger: {
		level: "debug",
		disabled: false,
	},
	onAPIError: {
		throw: true,
		onError: (error, ctx) => {
			// Custom error handling
			console.error(" error:", error);
		},
	},
});

// Debug: Log registered routes
console.log("Registered routes:", Object.keys(feature.api));
console.log("Feature handler:", typeof feature.handler);
console.log("Feature properties:", Object.keys(feature));

// Debug: Log the actual route paths
console.log("Route details:");
Object.entries(feature.api).forEach(([key, route]) => {
	console.log(
		`  ${key}:`,
		(route as any).path || (route as any).route || "No path info",
	);
});

const app = express();

// Test route to ensure Express is working
app.get("/test", (req, res) => {
	res.json({ message: "Express is working" });
});

// Debug: Test if handler is working
app.use("/", (req, res, next) => {
	console.log("Express middleware hit:", req.method, req.path);
	next();
});

app.use("/", toNodeHandler(feature)); // ✅ must follow the middleware

// // Start server
const PORT = 3001;
app.listen(PORT, "localhost", () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
