import { getDbClient } from './db/factory';
import { dbResponseMappers } from './db/sql-utils';
import { DbClient, DbConfig, SettingsDbData } from './db/types';
import { AppSettingsData } from './types';

export class AppSettings {
  private data?: Record<string, any>;

  private tableName: string;
  private dbClient: DbClient;
  private refreshIntervalInSeconds: number;

  constructor(opts: {
    dbConfig: DbConfig;
    tableName?: string;
    refreshIntervalInSeconds?: number;
  }) {
    this.tableName = opts.tableName || 'application_preference';
    this.refreshIntervalInSeconds = opts.refreshIntervalInSeconds || 3;
    this.dbClient = getDbClient(opts.dbConfig, this.tableName);
  }

  private convertDbDataToResponseData(data: SettingsDbData[]) {
    const settings = data.reduce((obj, d) => {
      const key = d.setting_key;
      const type = d.setting_type;
      const value = dbResponseMappers[type]
        ? dbResponseMappers[type]!(d.setting_value)
        : d.setting_value;
      obj[key] = value;
      return obj;
    }, {} as Record<string, any>);
    return settings;
  }

  private refresh = async (updatedData?: AppSettingsData) => {
    try {
      console.log(
        `AppSettings: refreshing data`,
        updatedData ? `: updated '${updatedData.key}'` : '(scheduled)',
      );
      const data = await this.dbClient.getAll();

      if (!data.length) {
        return;
      }

      this.data = this.convertDbDataToResponseData(data);
    } catch (error) {
      console.error(
        `AppSettings: could not refresh app settings from db: `,
        error,
      );
    }
  };

  public async init(): Promise<void> {
    console.log(`AppSettings: initializing db`);
    await this.dbClient.setup();
    await this.refresh();

    setInterval(() => this.refresh(), this.refreshIntervalInSeconds * 1000);
  }

  public get(key: string, defaultValue?: any): any | undefined {
    if (!this.data || typeof this.data[key] === 'undefined') {
      return defaultValue;
    }
    return this.data[key];
  }

  public getAll(): Record<string, any> {
    return this.data || {};
  }

  public async set(data: AppSettingsData) {
    await this.dbClient.set(data);
    await this.refresh(data);
  }
}
