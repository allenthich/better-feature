import { featureClient } from "~/lib/feature-client";

export default defineNuxtRouteMiddleware(async (to, from) => {
	const { data: session } = await featureClient.useSession(useFetch);
	if (!session.value) {
		if (to.path === "/dashboard") {
			return navigateTo("/");
		}
	}
});
