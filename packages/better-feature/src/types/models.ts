import type { BetterFeatureOptions } from "./options";
import type { UnionToIntersection } from "./helper";
import type { BetterFeaturePlugin } from "./plugins";

export type InferPluginTypes<O extends BetterFeatureOptions<any>> =
	O["plugins"] extends Array<infer P>
		? UnionToIntersection<
				P extends BetterFeaturePlugin<any>
					? P["$Infer"] extends Record<string, any>
						? P["$Infer"]
						: {}
					: {}
			>
		: {};

interface RateLimit {
	/**
	 * The key to use for rate limiting
	 */
	key: string;
	/**
	 * The number of requests made
	 */
	count: number;
	/**
	 * The last request time in milliseconds
	 */
	lastRequest: number;
}

export type { RateLimit };
