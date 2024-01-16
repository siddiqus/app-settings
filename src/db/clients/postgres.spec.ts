import { AppSettingsData } from 'src/types';
import { stripExtraSpace } from '../sql-utils';
import { PostgresConfig } from '../types';
import { PostgresClient } from './postgres'; // Replace with the actual import path

const sampleConfig = {
  host: 'localhost',
  user: 'testUser',
  password: 'testPassword',
  database: 'testDatabase',
} as PostgresConfig;

const testTableName = 'testTable';

describe('PostgresClient', () => {
  let client: PostgresClient;

  let mockClient: {
    query: jest.SpyInstance;
    release: jest.SpyInstance;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    client = new PostgresClient(sampleConfig, testTableName);

    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: ['a', 'b', 'c'] } as any),
      release: jest.fn(),
    };

    (client as any).postgresPoolClass = class MockPool {
      connect = jest.fn().mockReturnValue(mockClient);
    };

    await client.setup();
  });

  describe('setup', () => {
    it('should create a table if it does not exist', async () => {
      expect(stripExtraSpace(mockClient.query.mock.calls[0][0])).toEqual(
        stripExtraSpace(
          `
      begin;
          create or replace function custom_on_update_timestamp_trigger_app_settings()
          returns trigger as $$
              begin
              new. "updated_at" = current_timestamp;
              return new;
              end;
          $$ language 'plpgsql';
          commit;
      `,
        ),
      );

      expect(stripExtraSpace(mockClient.query.mock.calls[1][0])).toEqual(
        stripExtraSpace(`
        begin;
        create table if not exists ${testTableName} (
            id serial not null,
            setting_key varchar(255) not null,
            setting_value text not null,
            setting_type varchar(100) not null,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            primary key (id),
            CONSTRAINT uk_setting_key UNIQUE (setting_key)
        );

        DROP TRIGGER IF EXISTS testTable__update_timestamp on ${testTableName};

        CREATE TRIGGER testTable__update_timestamp BEFORE INSERT OR UPDATE ON ${testTableName}
        FOR EACH ROW EXECUTE FUNCTION custom_on_update_timestamp_trigger_app_settings();

        commit;
    `),
      );
    });
  });

  describe('set', () => {
    it('should insert or update data in the table', async () => {
      const data: AppSettingsData = {
        key: 'newKey',
        value: 'newValue',
        type: 'string',
      };

      await client.set(data);

      const expectedQuery = `insert into ${testTableName} (setting_key, setting_type, setting_value)
      values ($1, $2, $3)
      on conflict(setting_key)
      do
      update set setting_value=EXCLUDED.setting_value, setting_type=EXCLUDED.setting_type;`;

      // first and second calls are setup, second call is insertion
      expect(stripExtraSpace(mockClient.query.mock.calls[2][0])).toEqual(
        stripExtraSpace(expectedQuery),
      );
      expect(mockClient.query.mock.calls[2][1]).toEqual([
        data.key,
        data.type,
        data.value,
      ]);
    });

    it('should handle json data', async () => {
      const data: AppSettingsData = {
        key: 'newKey',
        value: {
          hello: 'world',
        },
        type: 'json',
      };

      await client.set(data);

      expect(mockClient.query.mock.calls[2][1]).toEqual([
        data.key,
        data.type,
        JSON.stringify(data.value),
      ]);
    });
  });

  describe('getAll', () => {
    it('should return all data from the table', async () => {
      const result = await client.getAll();
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });
});
