import { remove } from 'lodash';
import { Dialect } from './types';

const filterUndefined = <T extends Record<string, any>>(obj: T): T => {
  return Object.entries(obj).reduce(
    (acc, [k, v]) => (v === undefined ? acc : { ...acc, [k]: v }),
    {},
  ) as T;
};

// const convertToMysqlTime = (dateObj: Date): string => {
//   return moment(dateObj).format('YYYY-MM-DD HH:mm:ss')
// }

const sqlCharacterRegex = new RegExp(`[\0\x08\x09\x1a\n\r"'\\%]`, 'g');

export function sanitizeSqlString(str: string) {
  return str.replace(sqlCharacterRegex, (char: string) => {
    switch (char) {
      case '\0':
        return '\\0';
      case '\x08':
        return '\\b';
      case '\x09':
        return '\\t';
      case '\x1a':
        return '\\z';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '"':
      // eslint-disable-next-line quotes, no-fallthrough
      case "'":
      case '\\':
      case '%':
        return `\\${char}`; // prepends a backslash to backslash, percent,
      // and double/single quotes
      default:
        return char;
    }
  });
}

export function getJsonStringified(val: any) {
  if (!val) {
    return '{}';
  }

  try {
    const content = JSON.stringify(val);
    return content;
  } catch (error) {
    return '{}';
  }
}

export const getSanitizedSqlValue = (value: any): any => {
  let newValue = value;
  if (newValue === null) {
    newValue = 'null';
    //   } else if (value instanceof Date) {
    // newValue = `'${convertToMysqlTime(newValue)}'`
  } else if (typeof value === 'object') {
    newValue = getJsonStringified(value);
    newValue = sanitizeSqlString(newValue);
    newValue = (newValue as string).replace(/\\/gim, '');
    newValue = `'${newValue}'`;
  } else if (typeof value === 'string') {
    newValue = sanitizeSqlString(newValue);
    newValue = `'${newValue}'`;
  }
  return newValue;
};

export const generateUpdateSqlWithWhereClause = (opts: {
  tableName: string;
  whereClause: string;
  updateData: Record<string, any>;
}) => {
  const { tableName, updateData, whereClause } = opts;
  if (!updateData || !Object.keys(updateData).length) {
    return 'select 1;';
  }

  const filtered = filterUndefined(updateData);

  const tuples = Object.keys(filtered).map((key) => {
    let value = filtered[key];
    value = getSanitizedSqlValue(value);
    return `${key} = ${value}`;
  });

  const sql = `update ${tableName}
    set ${tuples.join(',')}
    where ${whereClause}`;

  return sql;
};

export const generateBulkInsertSQL = (opts: {
  dialect: Dialect;
  tableName: string;
  insertData: Array<Record<string, any>>;
}) => {
  const { dialect, tableName, insertData } = opts;
  if (!insertData.length) {
    return 'select 1;';
  }
  const keys = Object.keys(insertData[0]!);
  const tuples = insertData.map((props) => {
    const values = keys.map((key) => {
      let value = props[key];
      value = getSanitizedSqlValue(value);
      return value;
    });

    return `(${values.join(',')})`;
  });
  const valueList = tuples.join(', ');

  const keysForInsertHeading = keys
    .map((key) => (dialect === 'postgres' ? `"${key}"` : key))
    .join(',');
  const sql = `INSERT INTO ${tableName} (${keysForInsertHeading}) VALUES ${valueList};`;
  return sql;
};

const generateBulkUpdateSQL = (opts: {
  dialect: Dialect;
  tableName: string;
  updateData: Array<Record<string, any>>;
  primaryKey: string;
}) => {
  const { dialect, tableName, updateData, primaryKey } = opts;
  if (!updateData.length) {
    return 'select 1;';
  }
  const identifier = primaryKey;
  const keys = Object.keys(updateData[0]!);

  if (updateData.some((elem) => Object.keys(elem).length !== keys.length)) {
    throw new Error(
      'Please provide the same attributes for each element in the array',
    );
  }

  remove(keys, (k) => k === identifier);

  const tuples = updateData.map((props) => {
    const values = keys.map((key) => {
      let value = props[key];
      value = getSanitizedSqlValue(value);
      return value;
    });

    const sanitizedId = getSanitizedSqlValue(props[identifier]);

    return `(${sanitizedId},${values.join(',')})`;
  });
  const valueList = tuples.join(',\n');

  let updateStatement = '';

  if (dialect === 'postgres') {
    const updateKeys = keys
      .map((key) => `${key} = excluded.${key}`)
      .join(',\n');
    updateStatement = `ON CONFLICT (${primaryKey}) DO UPDATE SET ${updateKeys}`;
  } else {
    const updateKeys = keys.map((key) => `${key} = VALUES(${key})`).join(',\n');
    updateStatement = `ON DUPLICATE KEY UPDATE ${updateKeys}`;
  }

  const sql = `INSERT INTO ${tableName} (${identifier}, ${keys.join(',')})
  VALUES ${valueList}
  ${updateStatement};`;
  return sql;
};

export async function getUpsertSql<T extends { [key: string]: any }>(opts: {
  dialect: Dialect;
  tableName: string;
  data: T;
  identityColumn: string;
}) {
  const {
    dialect,
    data,
    tableName,

    identityColumn,
  } = opts;
  if (!data) {
    throw new Error('No data provided');
  }
  if (!tableName) {
    throw new Error('No tableName provided');
  }
  const sql = generateBulkUpdateSQL({
    dialect,
    tableName,
    updateData: [data],
    primaryKey: identityColumn,
  });
  return sql;
}

export const dbResponseMappers: Record<string, (val: string) => any> = {
  boolean: (val: string) => [1, true, 'true', '1', 1].includes(val),
  json: (val: string) => {
    if (typeof val === 'object') {
      return val;
    }
    try {
      return JSON.parse(val);
    } catch (error) {
      console.error(
        `AppSettings: could not parse json for app pref data`,
        error,
      );
      return {};
    }
  },
  number: (val: string) => Number(val),
};
