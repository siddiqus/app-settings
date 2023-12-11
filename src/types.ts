export type DataType = 'number' | 'json' | 'boolean' | 'string';

export type AppSettingsData = {
  key: string;
  value: any;
  type: DataType;
};
