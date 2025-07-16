import { createEndpoint, createMiddleware } from "better-call";
import type { FeatureContext } from "../init";

export const optionsMiddleware = createMiddleware(async () => {
	/**
	 * This will be passed on the instance of
	 * the context. Used to infer the type
	 * here.
	 */
	return {} as FeatureContext;
});

export const createFeatureMiddleware = createMiddleware.create({
	use: [
		optionsMiddleware,
		/**
		 * Only use for post hooks
		 */
		createMiddleware(async () => {
			return {} as {
				returned?: unknown;
				responseHeaders?: Headers;
			};
		}),
	],
});

export const createFeatureEndpoint = createEndpoint.create({
	use: [optionsMiddleware],
});

export const createTypedFeatureEndpoint = <T = any>() => {
	const typedOptionsMiddleware = createMiddleware(async () => {
		return {} as FeatureContext<T>;
	});
	
	return createEndpoint.create({
		use: [typedOptionsMiddleware],
	});
};

export const createPluginEndpoint = <T = any>() => createTypedFeatureEndpoint<T>();

export type FeatureEndpoint = ReturnType<typeof createFeatureEndpoint>;
export type FeatureMiddleware = ReturnType<typeof createFeatureMiddleware>;
