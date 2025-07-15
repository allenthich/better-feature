import { createAdapter, type AdapterDebugLogs } from "../create-adapter";
import { BetterFeatureError } from "../../error";
import type { Where } from "../../types";

export interface SequelizeConfig {
	/**
	 * Database provider.
	 */
	provider:
		| "sqlite"
		| "cockroachdb"
		| "mysql"
		| "postgresql"
		| "sqlserver"
		| "mongodb";

	/**
	 * Enable debug logs for the adapter
	 *
	 * @default false
	 */
	debugLogs?: AdapterDebugLogs;

	/**
	 * Use plural table names
	 *
	 * @default false
	 */
	usePlural?: boolean;
}

interface SequelizeClient {
	[key: string]: any;
}

interface SequelizeClientInternal {
	[model: string]: {
		create: (data: any) => Promise<any>;
		findFirst: (data: any) => Promise<any>;
		findMany: (data: any) => Promise<any>;
		update: (data: any) => Promise<any>;
		delete: (data: any) => Promise<any>;
		[key: string]: any;
	};
}

export const sequelizeAdapter = <T extends SequelizeClient = SequelizeClient>(
	sequelize: T,
	config: SequelizeConfig,
) =>
	createAdapter({
		config: {
			adapterId: "sequelize",
			adapterName: "Sequelize Adapter",
			usePlural: config.usePlural ?? false,
			debugLogs: config.debugLogs ?? false,
		},
		adapter: ({ getFieldName }) => {
			const db = sequelize as T & SequelizeClientInternal;

			const convertSelect = (select?: string[], model?: string) => {
				if (!select || !model) return undefined;
				return select.reduce((prev, cur) => {
					return {
						...prev,
						[getFieldName({ model, field: cur })]: true,
					};
				}, {});
			};
			function operatorToSequelizeOperator(operator: string) {
				switch (operator) {
					case "starts_with":
						return "startsWith";
					case "ends_with":
						return "endsWith";
					default:
						return operator;
				}
			}
			const convertWhereClause = (model: string, where?: Where[]) => {
				if (!where) return {};
				if (where.length === 1) {
					const w = where[0];
					if (!w) {
						return;
					}
					return {
						[getFieldName({ model, field: w.field })]:
							w.operator === "eq" || !w.operator
								? w.value
								: {
										[operatorToSequelizeOperator(w.operator)]: w.value,
									},
					};
				}
				const and = where.filter((w) => w.connector === "AND" || !w.connector);
				const or = where.filter((w) => w.connector === "OR");
				const andClause = and.map((w) => {
					return {
						[getFieldName({ model, field: w.field })]:
							w.operator === "eq" || !w.operator
								? w.value
								: {
										[operatorToSequelizeOperator(w.operator)]: w.value,
									},
					};
				});
				const orClause = or.map((w) => {
					return {
						[getFieldName({ model, field: w.field })]: {
							[w.operator || "eq"]: w.value,
						},
					};
				});

				return {
					...(andClause.length ? { AND: andClause } : {}),
					...(orClause.length ? { OR: orClause } : {}),
				};
			};

			return {
				async create({ model, data: values, select }) {
					if (!db[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. If you haven't generated the Sequelize client, you need to run 'npx sequelize generate'`,
						);
					}
					return await db[model].create({
						data: values,
						select: convertSelect(select, model),
					});
				},
				async findOne({ model, where, select }) {
					const whereClause = convertWhereClause(model, where);
					if (!db[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. If you haven't generated the Sequelize client, you need to run 'npx sequelize generate'`,
						);
					}
					return await db[model].findFirst({
						where: whereClause,
						select: convertSelect(select, model),
					});
				},
				async findMany({ model, where, limit, offset, sortBy }) {
					const whereClause = convertWhereClause(model, where);
					if (!db[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. If you haven't generated the Sequelize client, you need to run 'npx sequelize generate'`,
						);
					}

					return (await db[model].findMany({
						where: whereClause,
						take: limit || 100,
						skip: offset || 0,
						...(sortBy?.field
							? {
									orderBy: {
										[getFieldName({ model, field: sortBy.field })]:
											sortBy.direction === "desc" ? "desc" : "asc",
									},
								}
							: {}),
					})) as any[];
				},
				async count({ model, where }) {
					const whereClause = convertWhereClause(model, where);
					if (!db[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. If you haven't generated the Sequelize client, you need to run 'npx sequelize generate'`,
						);
					}
					return await db[model].count({
						where: whereClause,
					});
				},
				async update({ model, where, update }) {
					if (!db[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. If you haven't generated the Sequelize client, you need to run 'npx sequelize generate'`,
						);
					}
					const whereClause = convertWhereClause(model, where);
					return await db[model].update({
						where: whereClause,
						data: update,
					});
				},
				async updateMany({ model, where, update }) {
					const whereClause = convertWhereClause(model, where);
					const result = await db[model].updateMany({
						where: whereClause,
						data: update,
					});
					return result ? (result.count as number) : 0;
				},
				async delete({ model, where }) {
					const whereClause = convertWhereClause(model, where);
					try {
						await db[model].delete({
							where: whereClause,
						});
					} catch (e) {
						// If the record doesn't exist, we don't want to throw an error
					}
				},
				async deleteMany({ model, where }) {
					const whereClause = convertWhereClause(model, where);
					const result = await db[model].deleteMany({
						where: whereClause,
					});
					return result ? (result.count as number) : 0;
				},
				options: config,
				pool: sequelize as T,
			};
		},
	});
