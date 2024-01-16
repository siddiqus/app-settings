import { Collection, Db, MongoClient } from 'mongodb';
import { AppSettingsData } from 'src/types';
import { DbClient, MongoConfig, SettingsDbData } from '../types';

export function generateMongoDBConnectionUri(config: {
  user: string;
  password: string;
  host: string;
  database: string;
  port?: number;
}): string {
  const { user, password, host } = config;

  const uri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(
    password,
  )}@${host}`;

  return uri;
}

export class MongoDbClient extends DbClient {
  protected dbDependency?: MongoClient;
  private database?: Db;
  private collection?: Collection;

  public async setup() {
    const { user, password, host, database, ...options } = this
      .dbConfig as MongoConfig;

    const uri = generateMongoDBConnectionUri({
      user,
      password,
      host,
      database,
    });

    this.dbDependency = new MongoClient(uri, options);
    await this.dbDependency.connect();

    this.database = this.dbDependency.db(this.dbConfig.database);

    await this.database.createCollection(this.tableName);
    this.collection = this.database!.collection(this.tableName);
  }

  public async set(data: AppSettingsData) {
    this.checkConnection();

    await this.collection!.updateOne(
      { setting_key: data.key },
      { $set: { setting_value: data.value, setting_type: data.type } },
      { upsert: true },
    );
  }

  public async getAll() {
    this.checkConnection();

    const results = await this.collection!.find().toArray();

    return (results as any) as SettingsDbData[];
  }
}
