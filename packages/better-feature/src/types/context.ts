import type { EndpointContext, InputContext } from "better-call";
import type { FeatureContext } from "../init";

export type HookEndpointContext<TDatabase = any> = EndpointContext<
	string,
	any
> &
	Omit<InputContext<string, any>, "method"> & {
		context: FeatureContext<TDatabase> & {
			returned?: unknown;
			responseHeaders?: Headers;
		};
		headers?: Headers;
	};

export type GenericEndpointContext<TDatabase = any> = EndpointContext<
	string,
	any
> & {
	context: FeatureContext<TDatabase>;
};
