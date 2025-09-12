import { Kysely, MssqlDialect } from "kysely";
import {
	type Dialect,
	MysqlDialect,
	PostgresDialect,
	SqliteDialect,
} from "kysely";
import type { BetterFeatureOptions } from "../../types";
import type { KyselyDatabaseType } from "./types";

function getDatabaseType(
	db: BetterFeatureOptions["database"],
): KyselyDatabaseType | null {
	if (!db) {
		return null;
	}
	if (db && typeof db === "object" && "dialect" in db) {
		return getDatabaseType(db.dialect as Dialect);
	}
	if (db && typeof db === "object" && "createDriver" in db) {
		if (db instanceof SqliteDialect) {
			return "sqlite";
		}
		if (db instanceof MysqlDialect) {
			return "mysql";
		}
		if (db instanceof PostgresDialect) {
			return "postgres";
		}
		if (db instanceof MssqlDialect) {
			return "mssql";
		}
	}
	if (db && typeof db === "object" && "aggregate" in db) {
		return "sqlite";
	}

	if (db && typeof db === "object" && "getConnection" in db) {
		return "mysql";
	}
	if (db && typeof db === "object" && "connect" in db) {
		return "postgres";
	}

	return null;
}

// TODO: Refactor type narrowing
export const createKyselyAdapter = async <TDatabase = any>(
	config: BetterFeatureOptions<TDatabase>,
) => {
	const db = config.database;

	if (!db) {
		return {
			kysely: null,
			databaseType: null,
		};
	}

	// If db is an object with a 'db' and 'type' property
	if (db && typeof db === "object" && "db" in db && "type" in db) {
		return {
			kysely: (db as { db: Kysely<any> }).db,
			databaseType: (db as { type: KyselyDatabaseType }).type,
		};
	}

	// If db is an object with a 'dialect' and 'type' property
	if (db && typeof db === "object" && "dialect" in db && "type" in db) {
		return {
			kysely: new Kysely<any>({
				dialect: (db as { dialect: Dialect }).dialect,
			}),
			databaseType: (db as { type: KyselyDatabaseType }).type,
		};
	}

	let dialect: Dialect | undefined = undefined;

	const databaseType = getDatabaseType(db);

	if (db && typeof db === "object" && "createDriver" in db) {
		dialect = db as unknown as Dialect;
	}

	if (db && typeof db === "object" && "aggregate" in db) {
		dialect = new SqliteDialect({
			database: db as unknown as any, // Acceptable since we checked for 'aggregate'
		});
	}

	if (db && typeof db === "object" && "getConnection" in db) {
		// @ts-ignore - mysql2/promise
		dialect = new MysqlDialect(db as unknown as any);
	}

	if (db && typeof db === "object" && "connect" in db) {
		dialect = new PostgresDialect({
			pool: db as unknown as any,
		});
	}

	return {
		kysely: dialect ? new Kysely<any>({ dialect }) : null,
		databaseType,
	};
};
