import mysql from 'mysql2';
import { AppSettingsData } from 'src/types';
import { getSanitizedSqlValue } from '../sql-utils';
import { DbClient, MysqlConfig } from '../types';

export class MysqlClient extends DbClient {
  protected async _init() {}

  private async query(query: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const connection = mysql.createConnection(this.dbConfig as MysqlConfig);

      connection.query(query, (err, results) => {
        if (err) {
          connection.end();
          return reject(err);
        }
        connection.end();
        return resolve(results);
      });
    });
  }

  async setup() {
    const query = `
      create table if not exists ${this.tableName} (
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
    await this.query(query);
  }

  public async set(data: AppSettingsData) {
    const { type, key } = data;
    let value = data.value;
    if (typeof value === 'object' && type === 'json') {
      value = JSON.stringify(value);
    }

    const settingKey = getSanitizedSqlValue(key);
    const settingValue = getSanitizedSqlValue(value);
    const settingType = getSanitizedSqlValue(type);

    const sql = `insert into ${this.tableName}(setting_key, setting_type, setting_value)
    values (${settingKey}, ${settingType}, ${settingValue})
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type);`;

    await this.query(sql);
  }

  public async getAll() {
    const results = await this.query(`select * from ${this.tableName}`);
    return results;
  }
}
