import { DataType } from 'src/types';

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

export const getSanitizedSqlValue = (value: any): any => {
  let newValue = value;
  if (newValue === null) {
    newValue = 'null';
  } else if (typeof value === 'object') {
    newValue = JSON.stringify(value);
    newValue = sanitizeSqlString(newValue);
    newValue = (newValue as string).replace(/\\/gim, '');
    newValue = `'${newValue}'`;
  } else if (typeof value === 'string') {
    newValue = sanitizeSqlString(newValue);
    newValue = `'${newValue}'`;
  }
  return newValue;
};

export const dbResponseMappers: Record<DataType, (val: string) => any> = {
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
  string: (val: string) => `${val}`,
};

export function stripExtraSpace(input: string) {
  return input.replace(/((\s\s)|(\n))+/gm, ' ').trim();
}
