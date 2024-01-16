import { AppSettingsData, DataType } from 'src/types';

import { ConnectionOptions as MysqlConnectionConfig } from 'mysql2';
import { ConnectionConfig as PostgresConnectionConfig } from 'pg';

import { MongoClientOptions } from 'mongodb';

export interface SettingsDbData {
  setting_key: string;
  setting_value: any;
  setting_type: DataType;
}

export type MysqlConfig = { dialect: 'mysql' } & MysqlConnectionConfig;
export type PostgresConfig = { dialect: 'postgres' } & PostgresConnectionConfig;
export type MongoConfig = { dialect: 'mongodb' } & MongoClientOptions & {
    user: string;
    password: string;
    host: string;
    database: string;
  };

export type DbConfig = MysqlConfig | PostgresConfig | MongoConfig;

export abstract class DbClient {
  protected abstract dbDependency?: any;

  constructor(
    protected readonly dbConfig: DbConfig,
    protected readonly tableName: string,
  ) {}

  public abstract setup(): Promise<void>;
  public abstract set(data: AppSettingsData): Promise<void>;
  public abstract getAll(): Promise<SettingsDbData[]>;

  protected checkConnection() {
    if (!this.dbDependency) {
      throw new Error('setup() not called or error while initializing!');
    }
  }
}
