import { Collection, Db, MongoClient, MongoClientOptions } from 'mongodb'
import { AppSettingsData } from 'src/types'
import { DbClient, MongoConfig, SettingsDbData } from '../types'

function generateMongoDBConnectionUri(config: {
  user: string
  password: string
  host: string
  database: string
  port?: number
}): string {
  const { user, password, host } = config

  const uri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}`

  console.log(uri)
  return uri
}

export class MongoDbClient extends DbClient {
  private client?: MongoClient
  private database?: Db
  private collection?: Collection

  private checkConnection() {
    if (!this.client) {
      throw new Error('setup() not called!')
    }
  }

  public async setup() {
    const { user, password, host, database, ...options } = this
      .dbConfig as MongoConfig

    const uri = generateMongoDBConnectionUri({ user, password, host, database })

    this.client = new MongoClient(uri, options as MongoClientOptions)
    await this.client.connect()

    this.database = this.client.db(this.dbConfig.database)

    await this.database.createCollection(this.tableName)
    this.collection = this.database!.collection(this.tableName)
  }

  public async set(data: AppSettingsData) {
    this.checkConnection()

    await this.collection!.updateOne(
      { setting_key: data.key },
      { $set: { setting_value: data.value, setting_type: data.type } },
      { upsert: true }
    )
  }

  public async getAll() {
    const results = await this.collection!.find().toArray()

    return (results as any) as SettingsDbData[]
  }
}

/**
 * const { MongoClient } = require("mongodb");
// Replace the uri string with your connection string.
const uri =
  "mongodb+srv://<user>:<password>@<cluster-url>?retryWrites=true&writeConcern=majority";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
 */
