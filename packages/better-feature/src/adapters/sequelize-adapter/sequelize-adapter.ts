import { createAdapter, type AdapterDebugLogs } from "../create-adapter";
import { BetterFeatureError } from "../../error";
import type { Where } from "../../types";
import { Op } from "sequelize";

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
	models: {
		[model: string]: {
			create: (data: any) => Promise<any>;
			findOne: (data: any) => Promise<any>;
			findAll: (data: any) => Promise<any>;
			update: (values: any, options: any) => Promise<any>;
			destroy: (options: any) => Promise<any>;
			count: (options: any) => Promise<number>;
			[key: string]: any;
		};
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
			const db = sequelize as T & SequelizeClient;

			const convertSelect = (select?: string[], model?: string) => {
				if (!select || !model) return undefined;
				return select.map(field => getFieldName({ model, field }));
			};
			function operatorToSequelizeOperator(operator: string) {
				switch (operator) {
					case "starts_with":
						return Op.startsWith;
					case "ends_with":
						return Op.endsWith;
					case "contains":
						return Op.like;
					case "gt":
						return Op.gt;
					case "gte":
						return Op.gte;
					case "lt":
						return Op.lt;
					case "lte":
						return Op.lte;
					case "ne":
						return Op.ne;
					case "in":
						return Op.in;
					case "notIn":
						return Op.notIn;
					default:
						return Op.eq;
				}
			}
			const convertWhereClause = (model: string, where?: Where[]) => {
				if (!where) return {};
				if (where.length === 1) {
					const w = where[0];
					if (!w) {
						return {};
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
						[getFieldName({ model, field: w.field })]:
							w.operator === "eq" || !w.operator
								? w.value
								: {
										[operatorToSequelizeOperator(w.operator)]: w.value,
									},
					};
				});

				return {
					...(andClause.length > 1 ? { [Op.and]: andClause } : andClause[0] || {}),
					...(orClause.length ? { [Op.or]: orClause } : {}),
				};
			};

			return {
				async create({ model, data: values, select }) {
					if (!db.models[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. Make sure the model is defined in your Sequelize instance.`,
						);
					}
					const createdRecord = await db.models[model].create(values);
					
					// If select is specified, fetch the record with only selected fields
					if (select) {
						const attributes = convertSelect(select, model);
						return await db.models[model].findOne({
							where: { id: createdRecord.id },
							attributes
						});
					}
					
					return createdRecord;
				},
				async findOne({ model, where, select }) {
					const whereClause = convertWhereClause(model, where);
					if (!db.models[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. Make sure the model is defined in your Sequelize instance.`,
						);
					}
					const options: any = { where: whereClause };
					if (select) {
						options.attributes = convertSelect(select, model);
					}
					return await db.models[model].findOne(options);
				},
				async findMany({ model, where, limit, offset, sortBy }) {
					const whereClause = convertWhereClause(model, where);
					if (!db.models[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. Make sure the model is defined in your Sequelize instance.`,
						);
					}

					const options: any = {
						where: whereClause,
						limit: limit || 100,
						offset: offset || 0,
					};

					if (sortBy?.field) {
						options.order = [[
							getFieldName({ model, field: sortBy.field }),
							sortBy.direction === "desc" ? "DESC" : "ASC"
						]];
					}

					return await db.models[model].findAll(options) as any[];
				},
				async count({ model, where }) {
					const whereClause = convertWhereClause(model, where);
					if (!db.models[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. Make sure the model is defined in your Sequelize instance.`,
						);
					}
					return await db.models[model].count({
						where: whereClause,
					});
				},
				async update({ model, where, update }) {
					if (!db.models[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. Make sure the model is defined in your Sequelize instance.`,
						);
					}
					const whereClause = convertWhereClause(model, where);
					const [affectedCount, affectedRows] = await db.models[model].update(
						update,
						{ where: whereClause, returning: true }
					);
					return affectedRows[0] || null;
				},
				async updateMany({ model, where, update }) {
					const whereClause = convertWhereClause(model, where);
					if (!db.models[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. Make sure the model is defined in your Sequelize instance.`,
						);
					}
					const [affectedCount] = await db.models[model].update(
						update,
						{ where: whereClause }
					);
					return affectedCount;
				},
				async delete({ model, where }) {
					const whereClause = convertWhereClause(model, where);
					if (!db.models[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. Make sure the model is defined in your Sequelize instance.`,
						);
					}
					try {
						await db.models[model].destroy({
							where: whereClause,
						});
					} catch (e) {
						// If the record doesn't exist, we don't want to throw an error
					}
				},
				async deleteMany({ model, where }) {
					const whereClause = convertWhereClause(model, where);
					if (!db.models[model]) {
						throw new BetterFeatureError(
							`Model ${model} does not exist in the database. Make sure the model is defined in your Sequelize instance.`,
						);
					}
					const deletedCount = await db.models[model].destroy({
						where: whereClause,
					});
					return deletedCount;
				},
				options: config,
				pool: sequelize as T,
			};
		},
	});
