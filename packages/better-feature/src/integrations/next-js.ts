import type { BetterFeaturePlugin } from "../types";
import { createFeatureMiddleware } from "../plugins";

export function toNextJsHandler(
	auth:
		| {
				handler: (request: Request) => Promise<Response>;
		  }
		| ((request: Request) => Promise<Response>),
) {
	const handler = async (request: Request) => {
		return "handler" in auth ? auth.handler(request) : auth(request);
	};
	return {
		GET: handler,
		POST: handler,
	};
}

export const nextCookies = () => {
	return {
		id: "next-cookies",
	} satisfies BetterFeaturePlugin;
};
