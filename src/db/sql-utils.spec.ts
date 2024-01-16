import {
  dbResponseMappers,
  getSanitizedSqlValue,
  sanitizeSqlString,
} from './sql-utils';

describe('sql-utils', () => {
  describe('sanitizeSqlString', () => {
    it('should replace null character with "\\0"', () => {
      const result = sanitizeSqlString('abc\0def');
      expect(result).toEqual('abc\\0def');
    });

    it('should replace backspace character with "\\b"', () => {
      const result = sanitizeSqlString('abc\x08def');
      expect(result).toEqual('abc\\bdef');
    });

    it('should replace tab character with "\\t"', () => {
      const result = sanitizeSqlString('abc\x09def');
      expect(result).toEqual('abc\\tdef');
    });

    it('should replace substitute character with "\\z"', () => {
      const result = sanitizeSqlString('abc\x1adef');
      expect(result).toEqual('abc\\zdef');
    });

    it('should replace newline character with "\\n"', () => {
      const result = sanitizeSqlString('abc\ndef');
      expect(result).toEqual('abc\\ndef');
    });

    it('should replace carriage return character with "\\r"', () => {
      const result = sanitizeSqlString('abc\rdef');
      expect(result).toEqual('abc\\rdef');
    });

    it('should escape double quote, single quote, backslash, and percent characters', () => {
      const result = sanitizeSqlString('abc"\'\\%def');
      expect(result).toEqual('abc\\"\\\'\\\\%def');
    });

    it('should not modify string without special characters', () => {
      const result = sanitizeSqlString('abcdef');
      expect(result).toEqual('abcdef');
    });
  });

  describe('getSanitizedSqlValue', () => {
    it('should return "null" for null input', () => {
      const result = getSanitizedSqlValue(null);
      expect(result).toEqual('null');
    });

    it('should sanitize and stringify object input', () => {
      const inputObject = { key: 'value', nested: { number: 42 } };
      const jsonString = JSON.stringify(inputObject);
      const sanitizedString = sanitizeSqlString(jsonString).replace(/\\/g, '');
      const expectedValue = `'${sanitizedString}'`;
      const result = getSanitizedSqlValue(inputObject);
      expect(result).toEqual(expectedValue);
    });

    it('should sanitize and format string input', () => {
      const inputString = 'This is a test string';
      const sanitizedString = sanitizeSqlString(inputString).replace(/\\/g, '');
      const expectedValue = `'${sanitizedString}'`;
      const result = getSanitizedSqlValue(inputString);
      expect(result).toEqual(expectedValue);
    });

    it('should handle unknown input types and return the original value', () => {
      const unknownInput = 123; // For an unknown type, return the original value
      const result = getSanitizedSqlValue(unknownInput);
      expect(result).toEqual(unknownInput);
    });
  });

  describe('dbResponseMappers', () => {
    it('should map string as is', () => {
      const booleanMapper = dbResponseMappers.string;
      expect(booleanMapper('true')).toEqual('true');
    });

    it('should map boolean correctly', () => {
      const booleanMapper = dbResponseMappers.boolean;

      expect(booleanMapper('true')).toEqual(true);
      expect(booleanMapper('1')).toEqual(true);
      expect(booleanMapper('false')).toEqual(false);
      expect(booleanMapper('0')).toEqual(false);
      expect(booleanMapper('other')).toEqual(false);
    });

    it('should map json correctly', () => {
      const jsonMapper = dbResponseMappers.json;

      // Test with a valid JSON string
      const validJsonString = '{"key": "value"}';
      expect(jsonMapper(validJsonString)).toEqual({ key: 'value' });

      // Test with a non-JSON string
      const nonJsonString = 'not a json';
      console.error = jest.fn(); // Mock console.error to avoid actual console output
      expect(jsonMapper(nonJsonString)).toEqual({});
      expect(console.error).toHaveBeenCalled();
    });

    it('should map number correctly', () => {
      const numberMapper = dbResponseMappers.number;

      expect(numberMapper('123')).toEqual(123);
      expect(numberMapper('3.14')).toEqual(3.14);
      expect(numberMapper('invalid')).toEqual(NaN);
    });

    it('should return same value if already object', () => {
      const mapper = dbResponseMappers.json;

      expect(mapper({ hello: 'world' } as any)).toEqual({ hello: 'world' });
    });
  });
});
