import { MongoDbClient } from './clients/mongodb';
import { MysqlClient } from './clients/mysql';
import { PostgresClient } from './clients/postgres';
import { DbConfig, MongoConfig, MysqlConfig, PostgresConfig } from './types';

export const getDbClient = (dbConfig: DbConfig, tableName: string) => {
  const { dialect, ...config } = dbConfig;
  switch (dialect) {
    case 'mysql':
      return new MysqlClient(config as MysqlConfig, tableName);

    case 'postgres':
      return new PostgresClient(config as PostgresConfig, tableName);

    case 'mongodb':
      return new MongoDbClient(config as MongoConfig, tableName);

    default:
      throw new Error('Client not implemented');
  }
};
