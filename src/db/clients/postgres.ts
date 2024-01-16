import { Pool } from 'pg';
import { AppSettingsData } from 'src/types';
import { DbClient, PostgresConfig, SettingsDbData } from '../types';

export class PostgresClient extends DbClient {
  protected dbDependency?: Pool;

  private postgresPoolClass: typeof Pool;

  constructor(
    protected readonly dbConfig: PostgresConfig,
    protected readonly tableName: string,
  ) {
    super(dbConfig, tableName);

    this.postgresPoolClass = Pool;
  }

  private async query(sql: string, values?: any[]) {
    this.checkConnection();

    const client = await this.dbDependency!.connect();

    const res = await client.query(sql, values);

    client.release();

    return res;
  }

  async setup() {
    this.dbDependency = new this.postgresPoolClass(
      this.dbConfig as PostgresConfig,
    );

    const customUpdateFnName = `custom_on_update_timestamp_trigger_app_settings`;
    const createTriggerFunction = `
          begin;
          create or replace function ${customUpdateFnName}()
          returns trigger as $$
              begin
              new. "updated_at" = current_timestamp;
              return new;
              end;
          $$ language 'plpgsql';
          commit;
      `;
    await this.query(createTriggerFunction);

    const customTriggerName = `${this.tableName}__update_timestamp`;

    const createTableFunction = `
          begin;
          create table if not exists ${this.tableName} (
              id serial not null,
              setting_key varchar(255) not null,
              setting_value text not null,
              setting_type varchar(100) not null,
              created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
              primary key (id),
              CONSTRAINT uk_setting_key UNIQUE (setting_key)
          );

          DROP TRIGGER IF EXISTS ${customTriggerName} on ${this.tableName};

          CREATE TRIGGER ${customTriggerName} BEFORE INSERT OR UPDATE ON ${this.tableName}
          FOR EACH ROW EXECUTE FUNCTION ${customUpdateFnName}();

          commit;
      `;
    await this.query(createTableFunction);
  }

  public async set(data: AppSettingsData) {
    const settingKey = data.key;
    const settingType = data.type;

    let settingValue = data.value;

    if (data.type === 'json') {
      settingValue = JSON.stringify(data.value);
    }

    const sql = `
        insert into ${this.tableName} (setting_key, setting_type, setting_value)
        values ($1, $2, $3)
        on conflict(setting_key)
        do
        update set setting_value=EXCLUDED.setting_value, setting_type=EXCLUDED.setting_type;
    `;

    await this.query(sql, [settingKey, settingType, settingValue]);
  }

  public async getAll() {
    const results = await this.query(`select * from ${this.tableName}`);

    return (results.rows as any) as SettingsDbData[];
  }
}
