import { z } from "zod";
import { createFeatureEndpoint, createFeatureMiddleware } from "../../api/call";
import type { BetterFeaturePlugin } from "../../types/plugins";
import { APIError } from "better-call";
import type { InferOptionSchema } from "../../types";
import { testerSchema } from "./schema";
import { mergeSchema } from "../../db/schema";
export type TesterPluginOptions = {
	schema?: InferOptionSchema<typeof testerSchema>;
	/**
	 * The minimum attempts for testing
	 *
	 * @default 3
	 */
	minTestingAttempts?: number;
	/**
	 * A function to validate the input
	 *
	 * By default, the input should only contain alphanumeric characters and underscores
	 */
	someValidator?: (input: string) => boolean | Promise<boolean>;
};

export const tester = (options?: TesterPluginOptions) => {
	return {
		id: "tester",
		endpoints: {
			listTesters: createFeatureEndpoint(
				"/tester/list",
				{
					method: "GET",
					query: z.object({
						limit: z
							.number({
								description: "The maximum number of testers to return",
							})
							.optional()
							.default(10),
						offset: z
							.number({
								description: "The offset for pagination",
							})
							.optional()
							.default(0),
					}),
				},
				async (ctx) => {
					const { limit, offset } = ctx.query;
					const testers = await ctx.context.adapter.findMany<{
						id: string;
						input: string;
						validated: boolean;
						message: string;
					}>({
						model: "tester",
						where: [],
						limit,
						offset,
						sortBy: {
							field: "createdAt",
							direction: "desc",
						},
					});
					return ctx.json<{
						testers: {
							id: string;
							input: string;
							validated: boolean;
							message: string;
						}[];
						total: number;
					}>({
						testers: testers.map((tester) => ({
							id: tester.id,
							input: tester.input,
							validated: tester.validated,
							message: tester.message,
						})),
						total: await ctx.context.adapter.count({
							model: "tester",
							where: [],
						}),
					});
				},
			),
			someTester: createFeatureEndpoint(
				"/tester/initiate",
				{
					method: "POST",
					body: z.object({
						input: z.string({
							description: "The input to test",
						}),
						validate: z
							.boolean({
								description: "Whether to validate the input",
							})
							.optional(),
					}),
				},
				async (ctx) => {
					if (!ctx.body.input) {
						ctx.context.logger.error("input not found");
						throw new APIError("UNAUTHORIZED", {
							message: "SOMETHING WENT WRONG",
						});
					}

					const user = await ctx.context.adapter.findOne<{ input: string }>({
						model: "user",
						where: [
							{
								field: "input",
								value: ctx.body.input.toLowerCase(),
							},
						],
					});

					return ctx.json<{
						example: {
							validated: boolean;
							message: string;
						};
					}>({
						example: {
							validated: true,
							message: "example",
						},
					});
				},
			),
		},
		schema: mergeSchema(testerSchema, options?.schema),
	} satisfies BetterFeaturePlugin;
};
