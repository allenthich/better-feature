import {
	APIError,
	toResponse,
	type EndpointContext,
	type EndpointOptions,
	type InputContext,
} from "better-call";
import type { FeatureEndpoint, FeatureMiddleware } from "./call";
import type { FeatureContext, HookEndpointContext } from "../types";
import defu from "defu";

type InternalContext = InputContext<string, any> &
	EndpointContext<string, any> & {
		asResponse?: boolean;
		context: FeatureContext & {
			returned?: unknown;
			responseHeaders?: Headers;
		};
	};

export function toFeatureEndpoints<E extends Record<string, FeatureEndpoint>>(
	endpoints: E,
	ctx: FeatureContext | Promise<FeatureContext>,
) {
	const api: Record<
		string,
		((
			context: EndpointContext<string, any> & InputContext<string, any>,
		) => Promise<any>) & {
			path?: string;
			options?: EndpointOptions;
		}
	> = {};

	for (const [key, endpoint] of Object.entries(endpoints)) {
		api[key] = async (context) => {
			const featureContext = await ctx;
			let internalContext: InternalContext = {
				...context,
				context: {
					...featureContext,
					returned: undefined,
					responseHeaders: undefined,
					session: null,
				},
				path: endpoint.path,
				headers: context?.headers ? new Headers(context?.headers) : undefined,
			};
			const { beforeHooks, afterHooks } = getHooks(featureContext);
			const before = await runBeforeHooks(internalContext, beforeHooks);
			/**
			 * If `before.context` is returned, it should
			 * get merged with the original context
			 */
			if (
				"context" in before &&
				before.context &&
				typeof before.context === "object"
			) {
				const { headers, ...rest } = before.context as {
					headers: Headers;
				};
				/**
				 * Headers should be merged differently
				 * so the hook doesn't override the whole
				 * header
				 */
				if (headers) {
					headers.forEach((value, key) => {
						(internalContext.headers as Headers).set(key, value);
					});
				}
				internalContext = defu(rest, internalContext);
			} else if (before) {
				/* Return before hook response if it's anything other than a context return */
				return before;
			}

			internalContext.asResponse = false;
			internalContext.returnHeaders = true;
			const result = (await endpoint(internalContext as any).catch((e: any) => {
				if (e instanceof APIError) {
					/**
					 * API Errors from response are caught
					 * and returned to hooks
					 */
					return {
						response: e,
						headers: e.headers ? new Headers(e.headers) : null,
					};
				}
				throw e;
			})) as {
				headers: Headers;
				response: any;
			};
			internalContext.context.returned = result.response;
			internalContext.context.responseHeaders = result.headers;

			const after = await runAfterHooks(internalContext, afterHooks);

			if (after.response) {
				result.response = after.response;
			}

			if (result.response instanceof APIError && !context?.asResponse) {
				throw result.response;
			}
			const response = context?.asResponse
				? toResponse(result.response, {
						headers: result.headers,
					})
				: context?.returnHeaders
					? {
							headers: result.headers,
							response: result.response,
						}
					: result.response;
			return response;
		};
		api[key].path = endpoint.path;
		api[key].options = endpoint.options;
	}
	return api as E;
}

async function runBeforeHooks(
	context: HookEndpointContext,
	hooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: FeatureMiddleware;
	}[],
) {
	let modifiedContext: {
		headers?: Headers;
	} = {};
	for (const hook of hooks) {
		if (hook.matcher(context)) {
			const result = await hook.handler({
				...context,
				returnHeaders: false,
			});
			if (result && typeof result === "object") {
				if ("context" in result && typeof result.context === "object") {
					const { headers, ...rest } = result.context as {
						headers: Headers;
					};
					if (headers instanceof Headers) {
						if (modifiedContext.headers) {
							headers.forEach((value, key) => {
								modifiedContext.headers?.set(key, value);
							});
						} else {
							modifiedContext.headers = headers;
						}
					}
					modifiedContext = defu(rest, modifiedContext);
					continue;
				}
				return result;
			}
		}
	}
	return { context: modifiedContext };
}

async function runAfterHooks(
	context: HookEndpointContext,
	hooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: FeatureMiddleware;
	}[],
) {
	for (const hook of hooks) {
		if (hook.matcher(context)) {
			const result = (await hook.handler(context).catch((e) => {
				if (e instanceof APIError) {
					return {
						response: e,
						headers: e.headers ? new Headers(e.headers) : null,
					};
				}
				throw e;
			})) as {
				response: any;
				headers: Headers;
			};
			if (result.headers) {
				result.headers.forEach((value, key) => {
					if (!context.context.responseHeaders) {
						context.context.responseHeaders = new Headers({
							[key]: value,
						});
					} else {
						if (key.toLowerCase() === "set-cookie") {
							context.context.responseHeaders.append(key, value);
						} else {
							context.context.responseHeaders.set(key, value);
						}
					}
				});
			}
			if (result.response) {
				context.context.returned = result.response;
			}
		}
	}
	return {
		response: context.context.returned,
		headers: context.context.responseHeaders,
	};
}

function getHooks(featureContext: FeatureContext) {
	const plugins = featureContext.options.plugins || [];
	const beforeHooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: FeatureMiddleware;
	}[] = [];
	const afterHooks: {
		matcher: (context: HookEndpointContext) => boolean;
		handler: FeatureMiddleware;
	}[] = [];
	if (featureContext.options.hooks?.before) {
		beforeHooks.push({
			matcher: () => true,
			handler: featureContext.options.hooks.before,
		});
	}
	if (featureContext.options.hooks?.after) {
		afterHooks.push({
			matcher: () => true,
			handler: featureContext.options.hooks.after,
		});
	}
	const pluginBeforeHooks = plugins
		.map((plugin) => {
			if (plugin.hooks?.before) {
				return plugin.hooks.before;
			}
		})
		.filter((plugin) => plugin !== undefined)
		.flat();
	const pluginAfterHooks = plugins
		.map((plugin) => {
			if (plugin.hooks?.after) {
				return plugin.hooks.after;
			}
		})
		.filter((plugin) => plugin !== undefined)
		.flat();

	/**
	 * Add plugin added hooks at last
	 */
	pluginBeforeHooks.length && beforeHooks.push(...pluginBeforeHooks);
	pluginAfterHooks.length && afterHooks.push(...pluginAfterHooks);

	return {
		beforeHooks,
		afterHooks,
	};
}
