import { MysqlClient } from './mysql'; // Replace with the actual import path
import { MysqlConfig } from '../types';
import { AppSettingsData } from '../../types';

const sampleConfig = {
  host: 'localhost',
  user: 'testUser',
  password: 'testPassword',
  database: 'testDatabase',
} as MysqlConfig;

const testTableName = 'testTable';

describe('MysqlClient', () => {
  let mysqlClient: MysqlClient;
  let createConnectionSpy: jest.SpyInstance;

  let mockConnection: {
    query: jest.SpyInstance;
    end: jest.SpyInstance;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mysqlClient = new MysqlClient(sampleConfig, testTableName);

    mockConnection = {
      query: jest.fn().mockImplementation((_query, callback) => {
        callback(null, [{ key: 'key', value: 'value', type: 'type' }]);
      }),
      end: jest.fn(),
    };
    createConnectionSpy = jest.fn().mockReturnValue(mockConnection);

    (mysqlClient as any).mysql = {
      createConnection: createConnectionSpy,
    } as any;
  });

  describe('setup', () => {
    it('should create a table if it does not exist', async () => {
      const expectedQuery = `
      create table if not exists ${testTableName} (
        id int(11) not null AUTO_INCREMENT,
        setting_key varchar(255) not null,
        setting_value text not null,
        setting_type varchar(100) not null,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        primary key (id),
        CONSTRAINT UK_setting_key UNIQUE (setting_key)
      );
      `;

      await mysqlClient.setup();

      expect(createConnectionSpy).toHaveBeenCalledWith({
        host: 'localhost',
        user: 'testUser',
        password: 'testPassword',
        database: 'testDatabase',
      });
      expect(mockConnection.query.mock.calls[0][0].trim()).toEqual(
        expectedQuery.trim(),
      );
    });

    it('should throw error and disable dependency check', async () => {
      mockConnection.query = jest
        .fn()
        .mockImplementation((_query, callback) => {
          callback(new Error('some error'), null);
        });

      await expect(mysqlClient.setup()).rejects.toThrow('some error');

      await expect(mysqlClient.getAll()).rejects.toThrow('setup() not called or error while initializing!');
    });
  });

  describe('set', () => {
    it('should insert or update data in the table', async () => {
      const data: AppSettingsData = {
        key: 'newKey',
        value: 'newValue',
        type: 'string',
      };

      await mysqlClient.setup();
      await mysqlClient.set(data);

      const expectedQuery = `insert into testTable(setting_key, setting_type, setting_value)
    values ('newKey', 'string', 'newValue')
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type);`;

      // first call is setup, second call is insertion
      expect(mockConnection.query.mock.calls[1][0].trim()).toEqual(
        expectedQuery.trim(),
      );
    });

    it('should throw error', async () => {
      const data: AppSettingsData = {
        key: 'newKey',
        value: 'newValue',
        type: 'string',
      };

      await mysqlClient.setup();

      mockConnection.query = jest
        .fn()
        .mockImplementation((_query, callback) => {
          callback(new Error('some error'), null);
        });

      await expect(mysqlClient.set(data)).rejects.toThrow('some error');
    });

    it('should handle json data', async () => {
      const data: AppSettingsData = {
        key: 'newKey',
        value: {
          hello: 'world',
        },
        type: 'json',
      };

      await mysqlClient.setup();
      await mysqlClient.set(data);

      const expectedQuery = `insert into testTable(setting_key, setting_type, setting_value)
    values ('newKey', 'json', '{\\"hello\\":\\"world\\"}')
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type);`;

      // first call is setup, second call is insertion
      expect(mockConnection.query.mock.calls[1][0].trim()).toEqual(
        expectedQuery.trim(),
      );
    });
  });

  describe('getAll', () => {
    it('should return all data from the table', async () => {
      await mysqlClient.setup();
      const result = await mysqlClient.getAll();
      expect(result).toEqual([{ key: 'key', value: 'value', type: 'type' }]);
    });
  });
});
