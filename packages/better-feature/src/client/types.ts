import type {
	BetterFetch,
	BetterFetchOption,
	BetterFetchPlugin,
} from "@better-fetch/fetch";
import type { BetterFeaturePlugin } from "../types/plugins";
import type { Atom, WritableAtom } from "nanostores";
import type {
	LiteralString,
	StripEmptyObjects,
	UnionToIntersection,
} from "../types/helper";
import type { Feature } from "../feature";
import type { InferRoutes } from "./path-to-object";
import type { InferFieldsInputClient, InferFieldsOutput } from "../db";

export type AtomListener = {
	matcher: (path: string) => boolean;
	signal: "$sessionSignal" | Omit<string, "$sessionSignal">;
};

export interface Store {
	notify: (signal: string) => void;
	listen: (signal: string, listener: () => void) => void;
	atoms: Record<string, WritableAtom<any>>;
}

export interface BetterFeatureClientPlugin {
	id: LiteralString;
	/**
	 * only used for type inference. don't pass the
	 * actual plugin
	 */
	$InferServerPlugin?: BetterFeaturePlugin;
	/**
	 * Custom actions
	 */
	getActions?: (
		$fetch: BetterFetch,
		$store: Store,
		/**
		 * better-auth client options
		 */
		options: ClientOptions | undefined,
	) => Record<string, any>;
	/**
	 * State atoms that'll be resolved by each framework
	 * auth store.
	 */
	getAtoms?: ($fetch: BetterFetch) => Record<string, Atom<any>>;
	/**
	 * specify path methods for server plugin inferred
	 * endpoints to force a specific method.
	 */
	pathMethods?: Record<string, "POST" | "GET">;
	/**
	 * Better fetch plugins
	 */
	fetchPlugins?: BetterFetchPlugin[];
	/**
	 * a list of recaller based on a matcher function.
	 * The signal name needs to match a signal in this
	 * plugin or any plugin the user might have added.
	 */
	atomListeners?: AtomListener[];
}

export interface ClientOptions {
	fetchOptions?: BetterFetchOption;
	plugins?: BetterFeatureClientPlugin[];
	baseURL?: string;
	basePath?: string;
	disableDefaultFetchPlugins?: boolean;
}

export type InferClientAPI<O extends ClientOptions> = InferRoutes<
	O["plugins"] extends Array<any>
		? Feature["api"] &
				(O["plugins"] extends Array<infer Pl>
					? UnionToIntersection<
							Pl extends {
								$InferServerPlugin: infer Plug;
							}
								? Plug extends {
										endpoints: infer Endpoints;
									}
									? Endpoints
									: {}
								: {}
						>
					: {})
		: Feature["api"],
	O
>;

export type InferActions<O extends ClientOptions> = O["plugins"] extends Array<
	infer Plugin
>
	? UnionToIntersection<
			Plugin extends BetterFeatureClientPlugin
				? Plugin["getActions"] extends (...args: any) => infer Actions
					? Actions
					: {}
				: {}
		>
	: {};

export type InferErrorCodes<O extends ClientOptions> =
	O["plugins"] extends Array<infer Plugin>
		? UnionToIntersection<
				Plugin extends BetterFeatureClientPlugin
					? Plugin["$InferServerPlugin"] extends BetterFeaturePlugin
						? Plugin["$InferServerPlugin"]["$ERROR_CODES"]
						: {}
					: {}
			>
		: {};
/**
 * signals are just used to recall a computed value.
 * as a convention they start with "$"
 */
export type IsSignal<T> = T extends `$${infer _}` ? true : false;

export type InferPluginsFromClient<O extends ClientOptions> =
	O["plugins"] extends Array<BetterFeatureClientPlugin>
		? Array<O["plugins"][number]["$InferServerPlugin"]>
		: undefined;

export type InferAdditionalFromClient<
	Options extends ClientOptions,
	Key extends string,
	Format extends "input" | "output" = "output",
> = Options["plugins"] extends Array<infer T>
	? T extends BetterFeatureClientPlugin
		? T["$InferServerPlugin"] extends {
				schema: {
					[key in Key]: {
						fields: infer Field;
					};
				};
			}
			? Format extends "input"
				? InferFieldsInputClient<Field>
				: InferFieldsOutput<Field>
			: {}
		: {}
	: {};
