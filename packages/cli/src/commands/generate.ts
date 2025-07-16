import { Command } from "commander";
import { getConfig } from "../utils/get-config";
import { z } from "zod";
import { existsSync } from "fs";
import path from "path";
import { logger } from "better-feature";
import yoctoSpinner from "yocto-spinner";
import prompts from "prompts";
import fs from "fs/promises";
import chalk from "chalk";
import { getAdapter } from "better-feature/db";
import { getGenerator } from "../generators";
import { glob } from "glob";

export async function generateAction(opts: any) {
	const options = z
		.object({
			cwd: z.string(),
			config: z.string().optional(),
			output: z.string().optional(),
			y: z.boolean().optional(),
		})
		.parse(opts);

	const cwd = path.resolve(options.cwd);
	if (!existsSync(cwd)) {
		logger.error(`The directory "${cwd}" does not exist.`);
		process.exit(1);
	}
	const config = await getConfig({
		cwd,
		configPath: options.config,
	});
	if (!config) {
		logger.error(
			"No configuration file found. Add a `feature.ts` file to your project or pass the path to the configuration file using the `--config` flag.",
		);
		return;
	}

	const adapter = await getAdapter(config).catch((e) => {
		logger.error(e.message);
		process.exit(1);
	});

	// Handle Sequelize migrations from plugins first
	if (adapter.id === "sequelize" && config.plugins) {
		const migrationsToProcess: Array<{sourcePath: string, filename: string, pluginId: string}> = [];
		
		for (const plugin of config.plugins) {
			if (!plugin.id) continue;
			
			logger.info(`Processing plugin: ${plugin.id}`);
			
			// Check if plugin provides migration paths
			if (plugin.migrationPaths && plugin.migrationPaths.length > 0) {
				for (const migrationPath of plugin.migrationPaths) {
					if (existsSync(migrationPath)) {
						const filename = path.basename(migrationPath);
						// Only include files that match sequelize migration naming pattern
						if (/^\d{14}-.*\.js$/.test(filename)) {
							migrationsToProcess.push({
								sourcePath: migrationPath,
								filename,
								pluginId: plugin.id
							});
						}
					} else {
						logger.warn(`Migration file not found: ${migrationPath} for plugin ${plugin.id}`);
					}
				}
			} else {
				logger.warn(`No migration paths provided by plugin ${plugin.id}`);
			}
		}
		
		if (migrationsToProcess.length > 0) {
			const migrationsDir = path.join(cwd, "migrations");
			
			// Ensure migrations directory exists
			if (!existsSync(migrationsDir)) {
				await fs.mkdir(migrationsDir, { recursive: true });
			}
			
			logger.info(`Found ${migrationsToProcess.length} plugin migration(s) to copy...`);
			
			for (const migration of migrationsToProcess) {
				const targetPath = path.join(migrationsDir, migration.filename);
				
				// Check if migration already exists
				if (existsSync(targetPath)) {
					const sourceContent = await fs.readFile(migration.sourcePath, 'utf-8');
					const targetContent = await fs.readFile(targetPath, 'utf-8');
					
					if (sourceContent === targetContent) {
						logger.info(`✓ Migration ${migration.filename} from ${migration.pluginId} already up to date`);
						continue;
					}
					
					// Ask to overwrite
					const response = await prompts({
						type: "confirm",
						name: "confirm",
						message: `Migration ${migration.filename} from ${migration.pluginId} already exists. Overwrite?`,
					});
					
					if (!response.confirm) {
						logger.info(`Skipped ${migration.filename}`);
						continue;
					}
				}
				
				// Copy the migration file
				await fs.copyFile(migration.sourcePath, targetPath);
				logger.success(`✓ Copied migration: ${migration.filename} from ${migration.pluginId}`);
			}
			
			logger.success(`🚀 Plugin migrations copied successfully!`);
			process.exit(0);
		}
	}

	const spinner = yoctoSpinner({ text: "preparing schema..." }).start();

	const schema = await getGenerator({
		adapter,
		file: options.output,
		options: config,
	});

	spinner.stop();
	if (!schema.code) {
		logger.info("Your schema is already up to date.");
		process.exit(0);
	}
	if (schema.append || schema.overwrite) {
		let confirm = options.y;
		if (!confirm) {
			const response = await prompts({
				type: "confirm",
				name: "confirm",
				message: `The file ${
					schema.fileName
				} already exists. Do you want to ${chalk.yellow(
					`${schema.overwrite ? "overwrite" : "append"}`,
				)} the schema to the file?`,
			});
			confirm = response.confirm;
		}

		if (confirm) {
			const exist = existsSync(path.join(cwd, schema.fileName));
			if (!exist) {
				await fs.mkdir(path.dirname(path.join(cwd, schema.fileName)), {
					recursive: true,
				});
			}
			if (schema.overwrite) {
				await fs.writeFile(path.join(cwd, schema.fileName), schema.code);
			} else {
				await fs.appendFile(path.join(cwd, schema.fileName), schema.code);
			}
			logger.success(
				`🚀 Schema was ${
					schema.overwrite ? "overwritten" : "appended"
				} successfully!`,
			);
			process.exit(0);
		} else {
			logger.error("Schema generation aborted.");
			process.exit(1);
		}
	}

	let confirm = options.y;

	if (!confirm) {
		const response = await prompts({
			type: "confirm",
			name: "confirm",
			message: `Do you want to generate the schema to ${chalk.yellow(
				schema.fileName,
			)}?`,
		});
		confirm = response.confirm;
	}

	if (!confirm) {
		logger.error("Schema generation aborted.");
		process.exit(1);
	}

	if (!options.output) {
		const dirExist = existsSync(path.dirname(path.join(cwd, schema.fileName)));
		if (!dirExist) {
			await fs.mkdir(path.dirname(path.join(cwd, schema.fileName)), {
				recursive: true,
			});
		}
	}
	await fs.writeFile(
		options.output || path.join(cwd, schema.fileName),
		schema.code,
	);
	logger.success(`🚀 Schema was generated successfully!`);
	process.exit(0);
}

export const generate = new Command("generate")
	.option(
		"-c, --cwd <cwd>",
		"the working directory. defaults to the current directory.",
		process.cwd(),
	)
	.option(
		"--config <config>",
		"the path to the configuration file. defaults to the first configuration file found.",
	)
	.option("--output <output>", "the file to output to the generated schema")
	.option("-y, --y", "automatically answer yes to all prompts", false)
	.action(generateAction);
