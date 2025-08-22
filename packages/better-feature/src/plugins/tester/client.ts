import { atom } from "nanostores";
import type { tester } from ".";
import type { BetterFeatureClientPlugin } from "../../client/types";
import { useFeatureQuery } from "../../client";
import type { Tester } from "./schema";

export const testerClient = () => {
	const $listTestersSignal = atom<boolean>(false);
	return {
		id: "tester",
		$InferServerPlugin: {} as ReturnType<typeof tester>,
		getAtoms: ($fetch) => {
			const listTesters = useFeatureQuery<Tester[]>(
				$listTestersSignal,
				"/tester/list",
				$fetch,
				{
					method: "GET",
				},
			);

			return {
				$listTestersSignal,
				listTesters,
			};
		},
		atomListeners: [
			{
				matcher(path) {
					return path === "/tester/list";
				},
				signal: "$listTestersSignal",
			},
		],
	} satisfies BetterFeatureClientPlugin;
};
