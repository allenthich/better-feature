import type { Dialect, Kysely, MysqlPool, PostgresPool } from "kysely";
import type { GenericEndpointContext } from ".";
import type { BetterFeaturePlugin } from "./plugins";
import type { AdapterInstance, SecondaryStorage } from "./adapter";
import type { KyselyDatabaseType } from "../adapters/kysely-adapter/types";
import type { FieldAttribute } from "../db";
import type { RateLimit } from "./models";
import type { FeatureContext } from ".";
import type { CookieOptions } from "better-call";
import type { Database } from "better-sqlite3";
import type { Logger } from "../utils";
import type { FeatureMiddleware } from "../plugins";
import type { LiteralUnion, OmitId } from "./helper";

export type BetterFeatureOptions<TDatabase = any> = {
	/**
	 * The name of the application
	 *
	 * process.env.APP_NAME
	 *
	 * @default "Better Feature"
	 */
	appName?: string;
	/**
	 * Base URL for the Better Feature. This is typically the
	 * root URL where your application server is hosted.
	 * If not explicitly set,
	 * the system will check the following environment variable:
	 *
	 * process.env.BETTER_AUTH_URL
	 *
	 * If not set it will throw an error.
	 */
	baseURL?: string;
	/**
	 * Base path for the Better Feature. This is typically
	 * the path where the
	 * Better Feature routes are mounted.
	 *
	 * @default "/"
	 */
	basePath?: string;
	/**
	 * The secret to use for encryption,
	 * signing and hashing.
	 *
	 * By default Better Feature will look for
	 * the following environment variables:
	 * process.env.BETTER_AUTH_SECRET,
	 * process.env.AUTH_SECRET
	 * If none of these environment
	 * variables are set,
	 * it will default to
	 * "better-feature-secret-123456789".
	 *
	 * on production if it's not set
	 * it will throw an error.
	 *
	 * you can generate a good secret
	 * using the following command:
	 * @example
	 * ```bash
	 * openssl rand -base64 32
	 * ```
	 */
	secret?: string;
	/**
	 * Database configuration
	 */
	database?: TDatabase extends never
		?
				| PostgresPool
				| MysqlPool
				| Database
				| Dialect
				| AdapterInstance
				| {
						dialect: Dialect;
						type: KyselyDatabaseType;
						/**
						 * casing for table names
						 *
						 * @default "camel"
						 */
						casing?: "snake" | "camel";
				  }
				| {
						/**
						 * Kysely instance
						 */
						db: Kysely<any>;
						/**
						 * Database type between postgres, mysql and sqlite
						 */
						type: KyselyDatabaseType;
						/**
						 * casing for table names
						 *
						 * @default "camel"
						 */
						casing?: "snake" | "camel";
				  }
		: TDatabase;
	/**
	 * Secondary storage configuration
	 *
	 * This is used to store session and rate limit data.
	 */
	secondaryStorage?: SecondaryStorage;
	/**
	 * List of Better Feature plugins
	 */
	plugins?: BetterFeaturePlugin[];
	/**
	 * List of trusted origins.
	 */
	trustedOrigins?:
		| string[]
		| ((request: Request) => string[] | Promise<string[]>);
	/**
	 * Rate limiting configuration
	 */
	rateLimit?: {
		/**
		 * By default, rate limiting is only
		 * enabled on production.
		 */
		enabled?: boolean;
		/**
		 * Default window to use for rate limiting. The value
		 * should be in seconds.
		 *
		 * @default 10 seconds
		 */
		window?: number;
		/**
		 * The default maximum number of requests allowed within the window.
		 *
		 * @default 100 requests
		 */
		max?: number;
		/**
		 * Custom rate limit rules to apply to
		 * specific paths.
		 */
		customRules?: {
			[key: string]:
				| {
						/**
						 * The window to use for the custom rule.
						 */
						window: number;
						/**
						 * The maximum number of requests allowed within the window.
						 */
						max: number;
				  }
				| ((request: Request) =>
						| { window: number; max: number }
						| Promise<{
								window: number;
								max: number;
						  }>);
		};
		/**
		 * Storage configuration
		 *
		 * By default, rate limiting is stored in memory. If you passed a
		 * secondary storage, rate limiting will be stored in the secondary
		 * storage.
		 *
		 * @default "memory"
		 */
		storage?: "memory" | "database" | "secondary-storage";
		/**
		 * If database is used as storage, the name of the table to
		 * use for rate limiting.
		 *
		 * @default "rateLimit"
		 */
		modelName?: string;
		/**
		 * Custom field names for the rate limit table
		 */
		fields?: Record<keyof RateLimit, string>;
		/**
		 * custom storage configuration.
		 *
		 * NOTE: If custom storage is used storage
		 * is ignored
		 */
		customStorage?: {
			get: (key: string) => Promise<RateLimit | undefined>;
			set: (key: string, value: RateLimit) => Promise<void>;
		};
	};
	/**
	 * Advanced options
	 */
	advanced?: {
		/**
		 * Ip address configuration
		 */
		ipAddress?: {
			/**
			 * List of headers to use for ip address
			 *
			 * Ip address is used for rate limiting and session tracking
			 *
			 * @example ["x-client-ip", "x-forwarded-for"]
			 *
			 * @default
			 * @link https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/utils/get-request-ip.ts#L8
			 */
			ipAddressHeaders?: string[];
			/**
			 * Disable ip tracking
			 *
			 * ⚠︎ This is a security risk and it may expose your application to abuse
			 */
			disableIpTracking?: boolean;
		};
		/**
		 * Use secure cookies
		 *
		 * @default false
		 */
		useSecureCookies?: boolean;
		/**
		 * Disable trusted origins check
		 *
		 * ⚠︎ This is a security risk and it may expose your application to CSRF attacks
		 */
		disableCSRFCheck?: boolean;
		/**
		 * Configure cookies to be cross subdomains
		 */
		crossSubDomainCookies?: {
			/**
			 * Enable cross subdomain cookies
			 */
			enabled: boolean;
			/**
			 * Additional cookies to be shared across subdomains
			 */
			additionalCookies?: string[];
			/**
			 * The domain to use for the cookies
			 *
			 * By default, the domain will be the root
			 * domain from the base URL.
			 */
			domain?: string;
		};
		/*
		 * Allows you to change default cookie names and attributes
		 *
		 * default cookie names:
		 * - "session_token"
		 * - "session_data"
		 * - "dont_remember"
		 *
		 * plugins can also add additional cookies
		 */
		cookies?: {
			[key: string]: {
				name?: string;
				attributes?: CookieOptions;
			};
		};
		defaultCookieAttributes?: CookieOptions;
		/**
		 * Prefix for cookies. If a cookie name is provided
		 * in cookies config, this will be overridden.
		 *
		 * @default
		 * ```txt
		 * "appName" -> which defaults to "better-feature"
		 * ```
		 */
		cookiePrefix?: string;
		/**
		 * Database configuration.
		 */
		database?: {
			/**
			 * The default number of records to return from the database
			 * when using the `findMany` adapter method.
			 *
			 * @default 100
			 */
			defaultFindManyLimit?: number;
			/**
			 * If your database auto increments number ids, set this to `true`.
			 *
			 * Note: If enabled, we will not handle ID generation (including if you use `generateId`), and it would be expected that your database will provide the ID automatically.
			 *
			 * @default false
			 */
			useNumberId?: boolean;
			/**
			 * Custom generateId function.
			 *
			 * If not provided, random ids will be generated.
			 * If set to false, the database's auto generated id will be used.
			 */
			generateId?:
				| ((options: {
						model: string;
						size?: number;
				  }) => string)
				| false;
		};
		/**
		 * Custom generateId function.
		 *
		 * If not provided, random ids will be generated.
		 * If set to false, the database's auto generated id will be used.
		 *
		 * @deprecated Please use `database.generateId` instead. This will be potentially removed in future releases.
		 */
		generateId?:
			| ((options: {
					model: string;
					size?: number;
			  }) => string)
			| false;
	};
	logger?: Logger;
	/**
	 * allows you to define custom hooks that can be
	 * executed during lifecycle of core database
	 * operations.
	 */
	databaseHooks?: {
		[key: string]: {
			create?: {
				before?: (
					data: Record<string, any>,
					ctx?: GenericEndpointContext<TDatabase>,
				) => void | Promise<any>;
				after?: (
					data: Record<string, any>,
					ctx?: GenericEndpointContext<TDatabase>,
				) => void | Promise<any>;
			};
			update?: {
				before?: (
					data: Record<string, any>,
					ctx?: GenericEndpointContext<TDatabase>,
				) => void | Promise<any>;
				after?: (
					data: Record<string, any>,
					ctx?: GenericEndpointContext<TDatabase>,
				) => void | Promise<any>;
			};
		};
	};
	/**
	 * API error handling
	 */
	onAPIError?: {
		/**
		 * Throw an error on API error
		 *
		 * @default false
		 */
		throw?: boolean;
		/**
		 * Custom error handler
		 *
		 * @param error
		 * @param ctx - Auth context
		 */
		onError?: (error: unknown, ctx: FeatureContext) => void | Promise<void>;
		/**
		 * The URL to redirect to on error
		 *
		 * When errorURL is provided, the error will be added to the URL as a query parameter
		 * and the user will be redirected to the errorURL.
		 *
		 * @default - "/error"
		 */
		errorURL?: string;
	};
	/**
	 * Hooks
	 */
	hooks?: {
		/**
		 * Before a request is processed
		 */
		before?: FeatureMiddleware;
		/**
		 * After a request is processed
		 */
		after?: FeatureMiddleware;
	};
	/**
	 * Disabled paths
	 *
	 * Paths you want to disable.
	 */
	disabledPaths?: string[];
};
