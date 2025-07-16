import type { BetterFeaturePlugin } from "better-feature";
import { createTypedFeatureEndpoint } from "better-feature/api";
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
	(): BetterFeaturePlugin<sequelizeDatabase> => {
		const createTypedEndpoint = createTypedFeatureEndpoint<sequelizeDatabase>();

		return {
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
				login: createTypedEndpoint(
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
					async (ctx) => {
						// Now ctx.context.adapter.pool is the Sequelize database
						const db = ctx.context.adapter.pool;
						if (!db) {
							throw new Error("Database not available");
						}

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
					},
				),

				hello: createTypedEndpoint(
					"/test",
					{
						method: "GET",
						response: { message: "string" },
					},
					async (ctx) => {
						// Now ctx.context.adapter.pool is automatically typed as sequelizeDatabase
						const db = ctx.context.adapter.pool;

						if (db) {
							// Full type safety without casting!
							const users = await db.models.User.findAll();
							console.log(`Found ${users.length} users`);
						}

						return ctx.json({ message: "Hello from membership plugin" });
					},
				),
			},
		};
	};
