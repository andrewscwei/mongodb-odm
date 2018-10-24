import is from '@sindresorhus/is';
import assert from 'assert';
import { ObjectID } from 'mongodb';
import { Document, Query, Schema } from '../types';
import _ from 'lodash';

/**
 * Options for sanitizeQuery().
 */
interface SanitizeQueryOptions {
  /**
   * If set to `true`, fields that are not specified in the schema will be
   * deleted as part of the querifying process.
   */
  strict?: boolean;
}

/**
 * Magically transforms any supported value into a valid input for querying db
 * collections. Note that this only handles generating a valid query. It does
 * not apply validation. The transformation process includes the following:
 *   1. Wraps an Object ID into a proper query.
 *   2. If strict mode is enabled, the provided schema will be used to strip out
 *      all extraneous fields from the input
 *   3. Performs a deep JSON parse of the value to undo any stringification,
 *      i.e. `'6'` becomes `6`.
 *
 * @param schema - The collection schema.
 * @param query - The input query to normalize.
 * @param options - Additional options.
 *
 * @return The normalized query.
 *
 * @example
 * // Returns { "_id": 5927f337c5178b9665b56b1e }
 * sanitizeQuery(schema, 5927f337c5178b9665b56b1e)
 * sanitizeQuery(schema, '5927f337c5178b9665b56b1e')
 * sanitizeQuery(schema, { _id: '5927f337c5178b9665b56b1e' })
 *
 * @example
 * // Returns { a: 'b', b: 'c', garbage: 'garbage' }
 * sanitizeQuery(schema, { a: 'b', b: 'c', garbage: 'garbage' }, { strict: false })
 *
 * @example
 * // Returns { a: 'b', b: 'c' }
 * sanitizeQuery(schema, { a: 'b', b: 'c', garbage: 'garbage' })
 * sanitizeQuery(schema, { a: 'b', b: 'c', garbage: 'garbage' }, { strict: true })
 */
export default function sanitizeQuery<T extends Document = Document>(schema: Schema, query: Query<T>, { strict = true }: SanitizeQueryOptions = {}): Partial<T> {
  // If argument is an ObjectID, wrap it in a proper query.
  if (is.directInstanceOf(query, ObjectID)) {
    return {
      _id: query,
    } as any;
  }
  else if (is.string(query)) {
    const objectId = new ObjectID(query);

    return {
      _id: objectId,
    } as any;
  }

  assert(is.object(query), new TypeError('`query` is expected to be an object'));

  const o = query as Partial<T>;

  // In strict mode, delete keys that are not in the schema. Ignore `_id`,
  // `createdAt`, and `updatedAt` fields because they are automatically
  // generated.
  if (strict) {
    for (const key in o) {
      if (key === '_id') continue;
      if (schema.timestamps && (key === 'createdAt')) continue;
      if (schema.timestamps && (key === 'updatedAt')) continue;
      if (schema.fields.hasOwnProperty(key)) continue;

      delete o[key];
    }
  }

  return o;
}
