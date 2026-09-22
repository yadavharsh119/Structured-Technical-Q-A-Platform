// Kysely Database interface definition
// Additional table interfaces will be added in subsequent phases

export interface MigrationTable {
  id: number;
  name: string;
  executed_at: Date;
}

export interface Database {
  _migrations: MigrationTable;
}
