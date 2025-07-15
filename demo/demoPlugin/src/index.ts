import type { BetterFeaturePlugin } from "better-feature";
import { createFeatureEndpoint } from "better-feature/api";
import { z } from "zod";

import { DataTypes, Model, Sequelize } from "sequelize";

export class User extends Model {
	declare membershipId?: string;
	declare membershipLevel?: string;
	declare password?: string;
	declare createdAt?: Date;
	declare updatedAt?: Date;
}

export const defineUserModel = (sequelize: Sequelize): typeof User => {
	User.init(
		{
			membershipId: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			membershipLevel: {
				type: DataTypes.STRING(100),
				allowNull: false,
				unique: true,
			},
			password: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			createdAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
			},
			updatedAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
			},
		},
		{
			sequelize, // ⬅️ passed in
			tableName: "user",
			modelName: "User",
			timestamps: true,
			underscored: false,
		},
	);

	return User;
};
type sequelizeDatabase = Sequelize & {
	models: {
		User: typeof User;
	};
};

export const membershipLoginPlugin =
	(): BetterFeaturePlugin<sequelizeDatabase> => ({
		id: "membership",

		schema: {
			test: {
				fields: {
					membershipId: { type: "string", required: true, unique: true },
					membershipLevel: { type: "string", required: false },
					password: {
						type: "string",
						required: true,
						defaultValue: "'1234afsd'",
					},
					createdAt: { type: "date", defaultValue: "Sequelize.NOW" },
					updatedAt: { type: "date", defaultValue: "Sequelize.NOW" },
				},
				modelName: "test",
			},
		},

		endpoints: {
			login: createFeatureEndpoint(
				"/membership/login",
				{
					method: "POST",
					body: z.object({
						membershipId: z.string(),
						password: z.string(),
					}),
					response: {
						token: "string",
						user: {
							membershipId: "string",
							membershipLevel: "string",
						},
					},
				},
				withTypedDb(async (ctx, db) => {
					const { membershipId, password } = ctx.body;

					const database = await db.models.User.findOne({
						where: {
							membershipId: membershipId,
						},
					});

					if (!database || password !== database.password) {
						throw new Error("Invalid credentials");
					}

					if (
						membershipId !== database.membershipId ||
						password !== database.password
					) {
						throw new Error("Invalid membershipId or password");
					}

					const token = "mock-token-123";

					return ctx.json({
						token,
						user: {
							membershipId: database.membershipId,
							membershipLevel: database.membershipLevel,
						},
					});
				}),
			),

			hello: createFeatureEndpoint(
				"/test",
				{
					method: "GET",
					response: { message: "string" },
				},
				async (ctx) => {
					if (
						ctx.context.options.context?.pool &&
						"models" in ctx.context.options.context.pool
					) {
						const db = ctx.context.options.context.pool;
						// Access the database pool
					}
					return ctx.json({ message: "Hello from membership plugin" });
				},
			),
		},
	});

let db: Sequelize & {
	models: {
		User: typeof User;
	};
};
const getModelTypedDb = (db: Sequelize) => {
	const User = defineUserModel(db);
	return db as Sequelize & {
		models: {
			User: typeof User;
		};
	};
};

const withTypedDb = <T>(
	handler: (ctx: any, db: sequelizeDatabase) => Promise<T>,
) => {
	return async (ctx: any) => {
		const db = ctx.context.adapter.pool as sequelizeDatabase;
		return handler(ctx, db);
	};
};
