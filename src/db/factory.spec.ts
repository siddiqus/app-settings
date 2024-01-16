import { MongoDbClient } from './clients/mongodb';
import { MysqlClient } from './clients/mysql';
import { PostgresClient } from './clients/postgres';
import { getDbClient } from './factory';

const mockTableName = 'test_table';

describe('getDbClient function', () => {
  it('should return a MysqlClient instance for MySQL dialect', () => {
    const mockDbConfig = {
      dialect: 'mysql',
    };
    const mysqlClient = getDbClient(mockDbConfig as any, mockTableName);
    expect(mysqlClient).toBeInstanceOf(MysqlClient);
  });

  it('should return a PostgresClient instance for Postgres dialect', () => {
    const postgresClient = getDbClient({ dialect: 'postgres' }, mockTableName);
    expect(postgresClient).toBeInstanceOf(PostgresClient);
  });

  it('should return a MongoDbClient instance for MongoDB dialect', () => {
    const mongoDbClient = getDbClient(
      { dialect: 'mongodb' } as any,
      mockTableName,
    );
    expect(mongoDbClient).toBeInstanceOf(MongoDbClient);
  });

  it('should throw an error for an unsupported dialect', () => {
    const unsupportedDialect = 'sqlite'; // Assuming 'sqlite' is not supported
    expect(() =>
      getDbClient({ dialect: unsupportedDialect } as any, mockTableName),
    ).toThrowError('Client not implemented');
  });
});
