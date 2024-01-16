import { MongoClient } from 'mongodb';
import { MongoDbClient } from './mongodb'; // Replace with the actual import path
import { MongoConfig } from '../types';
import { AppSettingsData } from 'src/types';

jest.mock('mongodb');

const sampleConfig = {
  user: 'testUser',
  password: 'testPassword',
  host: 'localhost',
  database: 'testDatabase',
} as MongoConfig;

describe('MongoDbClient', () => {
  let mongoDbClient: MongoDbClient;

  beforeEach(async () => {
    mongoDbClient = new MongoDbClient(sampleConfig, 'testTable');

    // Mock the necessary functions
    (MongoClient.prototype.connect as jest.Mock).mockResolvedValueOnce(null);
    (MongoClient.prototype.db as jest.Mock).mockReturnValueOnce({
      createCollection: jest.fn().mockResolvedValueOnce(null),
      collection: jest.fn().mockReturnValueOnce({
        updateOne: jest.fn().mockResolvedValueOnce(null),
        find: jest.fn().mockReturnValueOnce({
          toArray: jest
            .fn()
            .mockResolvedValueOnce([
              { key: 'key', value: 'value', type: 'type' },
            ]),
        }),
      }),
    });

    await mongoDbClient.setup();
  });

  describe('setup', () => {
    it('should connect to MongoDB and create a collection', async () => {
      expect(MongoClient.prototype.connect).toHaveBeenCalled();
      expect(MongoClient.prototype.db).toHaveBeenCalledWith('testDatabase');
      expect(
        (mongoDbClient as any).database.createCollection,
      ).toHaveBeenCalledWith('testTable');
    });
  });

  describe('set', () => {
    it('should update or insert data into the collection', async () => {
      const data: AppSettingsData = {
        key: 'newKey',
        value: 'newValue',
        type: 'string',
      };
      await mongoDbClient.set(data as any);

      expect((mongoDbClient as any).collection.updateOne).toHaveBeenCalledWith(
        { setting_key: data.key },
        { $set: { setting_value: data.value, setting_type: data.type } },
        { upsert: true },
      );
    });

    it('should throw an error if setup() is not called', async () => {
      mongoDbClient = new MongoDbClient(sampleConfig, 'testTable');

      await expect(
        mongoDbClient.set({ key: 'key', value: 'value', type: 'string' }),
      ).rejects.toThrow('setup() not called or error while initializing!');
    });
  });

  describe('getAll', () => {
    it('should return all data from the collection', async () => {
      const result = await mongoDbClient.getAll();
      expect(result).toEqual([{ key: 'key', value: 'value', type: 'type' }]);
    });

    it('should throw an error if setup() is not called', async () => {
      mongoDbClient = new MongoDbClient(
        {
          user: 'testUser',
          password: 'testPassword',
          host: 'localhost',
          database: 'testDatabase',
        } as MongoConfig,
        'testTable',
      );

      await expect(mongoDbClient.getAll()).rejects.toThrow(
        'setup() not called or error while initializing!',
      );
    });
  });
});
