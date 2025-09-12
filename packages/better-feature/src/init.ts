import { defu } from "defu";
import { createInternalAdapter, getMigrations } from "./db";
import { getFeatureTables } from "./db/get-tables";
import { getAdapter } from "./db/utils";
import type {
	Adapter,
	BetterFeatureOptions,
	BetterFeaturePlugin,
	SecondaryStorage,
} from "./types";
import { DEFAULT_SECRET } from "./utils/constants";
import { createLogger } from "./utils/logger";
import { generateId } from "./utils";
import { env, isProduction } from "./utils/env";
import { getBaseURL } from "./utils/url";
import type { LiteralUnion } from "./types/helper";
import { BetterFeatureError } from "./error";

export const init = async <TDatabase = any>(
	options: BetterFeatureOptions<TDatabase>,
) => {
	const adapter = await getAdapter(options);
	const plugins = options.plugins || [];
	const internalPlugins = getInternalPlugins<TDatabase>(options);
	const logger = createLogger(options.logger);

	const baseURL = getBaseURL(options.baseURL, options.basePath);

	const secret =
		options.secret ||
		env.BETTER_AUTH_SECRET ||
		env.AUTH_SECRET ||
		DEFAULT_SECRET;

	if (secret === DEFAULT_SECRET) {
		if (isProduction) {
			logger.error(
				"You are using the default secret. Please set `BETTER_AUTH_SECRET` in your environment variables or pass `secret` in your auth config.",
			);
		}
	}

	options = {
		...options,
		secret,
		baseURL: baseURL ? new URL(baseURL).origin : "",
		basePath: options.basePath || "/",
		plugins: plugins.concat(internalPlugins),
	};
	const tables = getFeatureTables(options);
	const generateIdFunc: FeatureContext<TDatabase>["generateId"] = ({
		model,
		size,
	}) => {
		if (typeof options.advanced?.generateId === "function") {
			return options.advanced.generateId({ model, size });
		}
		if (typeof options?.advanced?.database?.generateId === "function") {
			return options.advanced.database.generateId({ model, size });
		}
		return generateId(size);
	};

	const ctx: FeatureContext<TDatabase> = {
		appName: options.appName || "Better Feature",
		options,
		tables,
		trustedOrigins: getTrustedOrigins<TDatabase>(options),
		baseURL: baseURL || "",
		secret,
		rateLimit: {
			...options.rateLimit,
			enabled: options.rateLimit?.enabled ?? isProduction,
			window: options.rateLimit?.window || 10,
			max: options.rateLimit?.max || 100,
			storage:
				options.rateLimit?.storage ||
				(options.secondaryStorage ? "secondary-storage" : "memory"),
		},
		logger: logger,
		generateId: generateIdFunc,
		secondaryStorage: options.secondaryStorage,
		adapter: adapter,
		internalAdapter: createInternalAdapter(adapter, {
			options,
			hooks: options.databaseHooks ? [options.databaseHooks] : [],
			generateId: generateIdFunc,
		}),
		async runMigrations() {
			//only run migrations if database is provided and it's not an adapter
			if (
				!options.database ||
				(typeof options.database === "object" &&
					options.database !== null &&
					"updateMany" in options.database)
			) {
				throw new BetterFeatureError(
					"Database is not provided or it's an adapter. Migrations are only supported with a database instance.",
				);
			}
			const { runMigrations } = await getMigrations(options);
			await runMigrations();
		},
	};
	let { context } = runPluginInit<TDatabase>(ctx);
	return context;
};

export type FeatureContext<TDatabase = any> = {
	options: BetterFeatureOptions<TDatabase>;
	appName: string;
	baseURL: string;
	trustedOrigins: string[];
	logger: ReturnType<typeof createLogger>;
	rateLimit: {
		enabled: boolean;
		window: number;
		max: number;
		storage: "memory" | "database" | "secondary-storage";
	} & BetterFeatureOptions<TDatabase>["rateLimit"];
	adapter: Adapter;
	internalAdapter: ReturnType<typeof createInternalAdapter>;
	secret: string;
	generateId: (options: {
		model: string;
		size?: number;
	}) => string;
	secondaryStorage: SecondaryStorage | undefined;
	tables: ReturnType<typeof getFeatureTables>;
	runMigrations: () => Promise<void>;
};

function runPluginInit<TDatabase = any>(ctx: FeatureContext<TDatabase>) {
	let options = ctx.options;
	const plugins = options.plugins || [];
	let context: FeatureContext<TDatabase> = ctx;
	const dbHooks: BetterFeatureOptions<TDatabase>["databaseHooks"][] = [];
	for (const plugin of plugins) {
		if (plugin.init) {
			const result = plugin.init(ctx);
			if (typeof result === "object") {
				if (result.options) {
					const { databaseHooks, ...restOpts } = result.options;
					if (databaseHooks) {
						dbHooks.push(databaseHooks);
					}
					options = defu(options, restOpts);
				}
				if (result.context) {
					context = {
						...context,
						...(result.context as Partial<FeatureContext<TDatabase>>),
					};
				}
			}
		}
	}
	// Add the global database hooks last
	dbHooks.push(options.databaseHooks);
	context.internalAdapter = createInternalAdapter(ctx.adapter, {
		options,
		hooks: dbHooks.filter((u) => u !== undefined),
		generateId: ctx.generateId,
	});
	context.options = options;
	return { context };
}

function getInternalPlugins<TDatabase = any>(
	options: BetterFeatureOptions<TDatabase>,
) {
	const plugins: BetterFeaturePlugin<TDatabase>[] = [];
	if (options.advanced?.crossSubDomainCookies?.enabled) {
		//TODO: add internal plugin
	}
	return plugins;
}

function getTrustedOrigins<TDatabase = any>(
	options: BetterFeatureOptions<TDatabase>,
) {
	const baseURL = getBaseURL(options.baseURL, options.basePath);
	if (!baseURL) {
		return [];
	}
	const trustedOrigins = [new URL(baseURL).origin];
	if (options.trustedOrigins && Array.isArray(options.trustedOrigins)) {
		trustedOrigins.push(...options.trustedOrigins);
	}
	const envTrustedOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS;
	if (envTrustedOrigins) {
		trustedOrigins.push(...envTrustedOrigins.split(","));
	}
	return trustedOrigins;
}
