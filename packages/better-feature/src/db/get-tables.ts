import type { FieldAttribute } from ".";
import type { BetterFeatureOptions } from "../types";

export type BetterFeatureDbSchema = Record<
	string,
	{
		/**
		 * The name of the table in the database
		 */
		modelName: string;
		/**
		 * The fields of the table
		 */
		fields: Record<string, FieldAttribute>;
		/**
		 * Whether to disable migrations for this table
		 * @default false
		 */
		disableMigrations?: boolean;
		/**
		 * The order of the table
		 */
		order?: number;
	}
>;

export const getFeatureTables = <TDatabase = any>(
	options: BetterFeatureOptions<TDatabase>,
): BetterFeatureDbSchema => {
	const pluginSchema = options.plugins?.reduce(
		(acc, plugin) => {
			const schema = plugin.schema;
			if (!schema) return acc;
			for (const [key, value] of Object.entries(schema)) {
				acc[key] = {
					fields: {
						...acc[key]?.fields,
						...value.fields,
					},
					modelName: value.modelName || key,
				};
			}
			return acc;
		},
		{} as Record<
			string,
			{ fields: Record<string, FieldAttribute>; modelName: string }
		>,
	);

	const shouldAddRateLimitTable = options.rateLimit?.storage === "database";
	const rateLimitTable = {
		rateLimit: {
			modelName: options.rateLimit?.modelName || "rateLimit",
			fields: {
				key: {
					type: "string",
					fieldName: options.rateLimit?.fields?.key || "key",
				},
				count: {
					type: "number",
					fieldName: options.rateLimit?.fields?.count || "count",
				},
				lastRequest: {
					type: "number",
					bigint: true,
					fieldName: options.rateLimit?.fields?.lastRequest || "lastRequest",
				},
			},
		},
	} satisfies BetterFeatureDbSchema;

	const { ...pluginTables } = pluginSchema || {};

	return {
		...pluginTables,
		...(shouldAddRateLimitTable ? rateLimitTable : {}),
	} satisfies BetterFeatureDbSchema;
};
