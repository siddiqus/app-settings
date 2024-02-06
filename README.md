<p align="center">
  <img src="https://cdn-icons-png.flaticon.com/512/6295/6295417.png" width="100" />
</p>
<p align="center">
    <h1 align="center">Node App Settings</h1>
</p>
<p align="center">
    <em>Synchronous data access layer for your app configurations or feature flags as records in your existing database</em>
</p>

## Overview
This package provides an interface for storing data in your existing database with an in-memory cache layer for synchronous data access. The data could be feature flags, application configurations, etc. or anything else that you would need to change on the fly.

Supported databases at the moment are `Postgres`, `MongoDB`, and `MySQL`. The codebase follows a strategy pattern and devs can easily add new database implementations. Feel free to raise a pull request!

## Quick Start

Install as a dependency
```
yarn add @siddiqus/app-settings
```

Example code:

```typescript
import { AppSettings, MongoConfig } from '@siddiqus/app-settings';

// your database config, you can use your own configuration mechanism here
const config: MongoConfig = {
  dialect: 'mongodb',
  host: 'localhost',
  user: 'admin',
  password: 'password',
  database: 'testdb',
}; 

// this can be a singleton in your system
const appSettings = new AppSettings({
  dbConfig: config,
  tableName: 'app_settings_pg',
  refreshIntervalInSeconds: 300 // default interval is 300 seconds (5 minutes)
});

async function run() {
  await appSettings.init(); // this is needed to setup the db tables

  await appSettings.set({
    key: 'hey',
    value: { hey: 'there' },
    type: 'json',
  });

  await appSettings.set({
    key: 'someKey',
    value: 'boop',
    type: 'string', // string | boolean | json | number
  });

  const heyJson = appSettings.get('hey', {}); // notice this does not need await

  console.log(heyJson) // value is the { hey: there } object, or {} by default if the key does not exist 
```

## Internals

### Initialization
On initializing the instance with your database configurations, few things happen:
1. It creates (if not existing) a table to store the settings
2. It will fetch the records from the table and store the formatted data in an in-memory cache

### Fetching Data
- Any time the `set` method is called, it will refresh the cache after the record is added/updated
- A process refreshes the cache every 5 minutes (this is configurable)
- Since the data is coming from in-memory, no need to `await` the `get` or `getAll` functions

<hr/>

### Contributing Guidelines
<details closed>
1. **Fork the Repository**: Start by forking the project repository to your GitHub account.
2. **Clone Locally**: Clone the forked repository to your local machine using a Git client.
   ```sh
   git clone https://github.com/siddiqus/app-settings
   ```
3. **Create a New Branch**: Always work on a new branch, giving it a descriptive name.
   ```sh
   git checkout -b new-feature-x
   ```
4. **Make Your Changes**: Develop and test your changes locally.
5. **Commit Your Changes**: Commit with a clear message describing your updates.
   ```sh
   git commit -m 'Implemented new feature x.'
   ```
6. **Push to GitHub**: Push the changes to your forked repository.
   ```sh
   git push origin new-feature-x
   ```
7. **Submit a Pull Request**: Create a PR against the original project repository. Clearly describe the changes and their motivations.

Once your PR is reviewed and approved, it will be merged into the main branch.

</details>

---

## License

This project is protected under the MIT License. For more details, refer to the [reference](https://opensource.org/license/mit/) website.
