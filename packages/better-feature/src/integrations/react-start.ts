import type { BetterFeaturePlugin } from "../types";
import { createFeatureMiddleware } from "../plugins";

export const reactStartCookies = () => {
	return {
		id: "react-start-cookies",
	} satisfies BetterFeaturePlugin;
};
