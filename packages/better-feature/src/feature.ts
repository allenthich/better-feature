import { getEndpoints, router } from "./api";
import { init } from "./init";
import type { BetterFeatureOptions } from "./types/options";
import type {
	InferPluginErrorCodes,
	InferPluginTypes,
	FeatureContext,
} from "./types";
import type { PrettifyDeep, Expand } from "./types/helper";
import { getBaseURL, getOrigin } from "./utils/url";
import type { FilterActions, InferAPI } from "./types";
import { BASE_ERROR_CODES } from "./error/codes";
import { BetterFeatureError } from "./error";

export type WithJsDoc<T, D> = Expand<T & D>;

export const betterFeature = <
	TDatabase = any,
	O extends BetterFeatureOptions<TDatabase> = BetterFeatureOptions<TDatabase>,
>(
	options: O & Record<never, never>,
) => {
	const featureContext = init<TDatabase>(options as O);
	const { api } = getEndpoints(featureContext, options as O);
	const errorCodes = options.plugins?.reduce((acc, plugin) => {
		if (plugin.$ERROR_CODES) {
			return {
				...acc,
				...plugin.$ERROR_CODES,
			};
		}
		return acc;
	}, {});
	return {
		handler: async (request: Request) => {
			const ctx = await featureContext;
			const basePath = ctx.options.basePath || "/";
			if (!ctx.options.baseURL) {
				const baseURL = getBaseURL(undefined, basePath, request);
				if (baseURL) {
					ctx.baseURL = baseURL;
					ctx.options.baseURL = getOrigin(ctx.baseURL) || undefined;
				} else {
					throw new BetterFeatureError(
						"Could not get base URL from request. Please provide a valid base URL.",
					);
				}
			}
			ctx.trustedOrigins = [
				...(options.trustedOrigins
					? Array.isArray(options.trustedOrigins)
						? options.trustedOrigins
						: await options.trustedOrigins(request)
					: []),
				ctx.options.baseURL!,
			];
			const { handler } = router(ctx, options);
			return handler(request);
		},
		api: api as InferAPI<typeof api>,
		options: options as O,
		$context: featureContext,
		$Infer: {} as InferPluginTypes<O>,
		$ERROR_CODES: {
			...errorCodes,
			...BASE_ERROR_CODES,
		} as InferPluginErrorCodes<O> & typeof BASE_ERROR_CODES,
	};
};

export type Feature<TDatabase = any> = {
	handler: (request: Request) => Promise<Response>;
	api: FilterActions<ReturnType<typeof router>["endpoints"]>;
	options: BetterFeatureOptions<TDatabase>;
	$ERROR_CODES: typeof BASE_ERROR_CODES;
	$context: Promise<FeatureContext<TDatabase>>;
};
