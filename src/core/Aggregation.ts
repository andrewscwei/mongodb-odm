/**
 * @file Static utility class with helper functions for MongoDB's aggregation
 *       framework.
 */

import is from '@sindresorhus/is';
import { getModel } from '../index';
import { AggregationPipeline, AggregationStageDescriptor, FieldSpecs, GroupStageFactorySpecs, LookupStageFactoryOptions, LookupStageFactorySpecs, MatchStageFactoryOptions, MatchStageFactorySpecs, PipelineFactoryOptions, PipelineFactorySpecs, ProjectStageFactoryOptions, Schema, SortStageFactorySpecs } from '../types';
import sanitizeQuery from '../utils/sanitizeQuery';

export default abstract class Aggregation {
  /**
   * Generates a pipeline to pass into the aggregation framework.
   *
   * @param {Schema} schema - The collection schema.
   * @param specs - Specs for customizing the pipeline.
   * @param {Object|string} [specs.$group] - Group stage spec appended to end of
   *                                         the pipeline.
   * @param options - Additional options.
   *
   * @returns The generated aggregate pipeline.
   */
  static pipelineFactory(schema: Schema, { $lookup, $match, $prune, $group, $sort }: PipelineFactorySpecs = {}, { prefix = '', pipeline = [] }: PipelineFactoryOptions = {}): AggregationPipeline {
    if (!(is.undefined($match) || is.object($match) || is.string($match))) throw new Error('Bad $match descriptor provided');
    if (!(is.undefined($lookup) || is.object($lookup))) throw new Error('Bad $lookup descriptor provided');
    if (!(is.undefined($prune) || is.object($prune) || is.string($prune))) throw new Error('Bad $prune descriptor provided');
    if (!(is.undefined($group) || is.object($group) || is.string($group))) throw new Error('Bad $group descriptor provided');
    if (!(is.undefined($sort) || is.object($sort))) throw new Error('Bad $sort descriptor provided');
    if (!(is.string(prefix))) throw new Error('Bad prefix provided');
    if (!(is.array(pipeline))) throw new Error('Bad pipeline provided');

    // If lookup stage is specified, add it to beginning of the pipeline.
    if ($lookup) pipeline = Aggregation.lookupStageFactory(schema, $lookup, { fromPrefix: prefix, toPrefix: prefix }).concat(pipeline);

    // If match stage is specified, add it to the beginning of the pipeline.
    if ($match) pipeline = Aggregation.matchStageFactory(schema, $match, { prefix }).concat(pipeline);

    // If prune stage is specified, add it to the end of the pipeline.
    if ($prune) pipeline = pipeline.concat(Aggregation.matchStageFactory(schema, $prune));

    // If group stage is specified, add it to the end of the pipeline.
    if ($group) pipeline = pipeline.concat(Aggregation.groupStageFactory(schema, $group));

    // If sort stage is specified, add it to the end of the pipeline.
    if ($sort) pipeline = pipeline.concat(Aggregation.sortStageFactory(schema, $sort));

    return pipeline;
  }

  /**
   * Generates the $match stage of the aggregation pipeline.
   *
   * @param schema - The schema of the database collection.
   * @param specs - Specs (aka query in this case) that defines the match.
   * @param options - Additional options.
   *
   * @returns The aggregation pipeline that handles the generated $match stage.
   *
   * @example
   * // Returns [{ "$match": { "_id": 5927f337c5178b9665b56b1e } }]
   * matchStageFactory(schema, '5927f337c5178b9665b56b1e')
   *
   * @example
   * // Returns [{ "$match": { "foo._id": 5927f337c5178b9665b56b1e } }]
   * matchStageFactory(schema, '5927f337c5178b9665b56b1e', { prefix: 'foo.' })
   *
   * @example
   * // Returns [{ "$match": { "foo._id": 5927f337c5178b9665b56b1e, "foo.bar": 34 } }]
   * matchStageFactory(schema, { _id: 5927f337c5178b9665b56b1e, bar: 34 }, { prefix: 'foo.' })
   *
   * @see {@link https://docs.mongodb.com/manual/reference/operator/aggregation/match/}
   */
  static matchStageFactory<T = {}>(schema: Schema, specs: MatchStageFactorySpecs, { prefix = '' }: MatchStageFactoryOptions = {}): AggregationPipeline {
    const sanitized = sanitizeQuery<T>(schema, specs, { strict: false });
    const query: { [key: string]: any } = {};

    for (const key in sanitized) {
      if (!sanitized.hasOwnProperty(key)) continue;
      query[`${prefix}${key}`] = (sanitized as any)[key as keyof T];
    }

    return [{ $match: query }];
  }

  /**
   * Generates the $lookup stage of the aggregation pipeline.
   *
   * @param schema - The schema of the database collection.
   * @param specs - Specs that defines the $lookup stage, supports looking up
   *                nested foreign keys.
   * @param options - Additional options.
   *
   * @returns The aggregation pipeline that handles the generated $lookup stage.
   *
   * @example
   * // Returns [{ "$lookup": { "from": "subModels", "localField": "subModel", "foreignField": "_id", "as": "subModel" } },
   *             { "$unwind": { "path": "$subModel", "preserveNullAndEmptyArrays": true } }]
   * lookupStageFactory(schema, { subModel: true })
   *
   * @example
   * // Returns [{ "$lookup": { "from": "subModels", "localField": "subModel", "foreignField": "_id", "as": "subModel" } },
   *             { "$unwind": { "path": "$subModel", "preserveNullAndEmptyArrays": true } },
   *             { "$lookup": { "from": "subSubModels", "localField": "subModel.subSubModel", "foreignField": "_id", "as": "subModel.subSubModel" } },
   *             { "$unwind": { "path": "$subModel.subSubModel", "preserveNullAndEmptyArrays": true } }]
   * lookupStageFactory(schema, { subModel: { subSubModel: true } })
   *
   * @example
   * // Returns [{ "$lookup": { "from": "subModels", "localField": "foo.subModel", "foreignField": "_id", "as": "bar.subModel"" } },
   *             { "$unwind": { "path": "$bar.subModel", "preserveNullAndEmptyArrays": true } },
   *             { "$lookup": { "from": "subSubModels", "localField": "bar.subModel.subSubModel", "foreignField": "_id", "as": "bar.subModel.subSubModel" } },
   *             { "$unwind": { "path": "$bar.subModel.subSubModel", "preserveNullAndEmptyArrays": true } }]
   * lookupStageFactory(schema, { subModel: { subSubModel: true } }, { fromPrefix: 'foo.', toPrefix: 'bar.' })
   *
   * @see {@link https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/}
   */
  static lookupStageFactory(schema: Schema, specs: LookupStageFactorySpecs, { fromPrefix = '', toPrefix = '' }: LookupStageFactoryOptions = {}): AggregationPipeline {
    const fields: { [fieldName: string]: FieldSpecs} = schema.fields;

    let pipe: AggregationPipeline = [];

    for (const key in specs) {
      if (!specs.hasOwnProperty(key)) continue;

      const val = specs[key];
      if (!((val === true) || (typeof val === 'object'))) throw new Error(`[lookup(${schema}, ${specs}, ${{ fromPrefix, toPrefix }})] Invalid populate properties.`);

      const ref = fields[key] && fields[key].ref;
      if (!ref) throw new Error(`[lookup(${schema}, ${specs}, ${{ fromPrefix, toPrefix }})] The field to populate does not have a reference model specified in the schema.`);

      const schemaRef = getModel(ref!).schema;
      if (!schemaRef) throw new Error(`[lookup(${schema}, ${specs}, ${{ fromPrefix, toPrefix }})] Unable to find the model schema corresponding to the field to populate.`);

      pipe.push({
        $lookup: {
          from: `${schemaRef.collection}`,
          localField: `${fromPrefix}${key}`,
          foreignField: '_id',
          as: `${toPrefix}${key}`,
        },
      });

      pipe.push({
        $unwind: {
          path: `$${toPrefix}${key}`,
          preserveNullAndEmptyArrays: true,
        },
      });

      if (is.object(val)) {
        pipe = pipe.concat(Aggregation.lookupStageFactory(schemaRef, val, {
          fromPrefix: `${toPrefix}${key}.`,
          toPrefix: `${toPrefix}${key}.`,
        }));
      }
    }

    return pipe;
  }

  /**
   * Generates the $group stage of the aggregation pipeline.
   *
   * @param schema - The schema of the database collection.
   * @param specs - Specs that define the $group stage.
   *
   * @returns The aggregation pipeline that handles the generated $group stage.
   *
   * @example
   * // Returns [{ "$group": { "_id": "$foo" } }]
   * groupStageFactory(schema, 'foo')
   *
   * @example
   * // Returns [{ "$group": { "_id": "$subModel", "bar": "$bar" } }]
   * groupStageFactory(schema, { "_id": "$subModel", "bar": "$bar" })
   *
   * @see {@link https://docs.mongodb.com/manual/reference/operator/aggregation/group/}
   */
  static groupStageFactory(schema: Schema, specs: GroupStageFactorySpecs): AggregationPipeline {
    const pipe: AggregationPipeline = [];

    if (is.string(specs)) {
      pipe.push({ $group: { _id: `$${specs}` } });
    }
    else {
      pipe.push({ $group: specs });
    }

    return pipe;
  }

  /**
   * Generates the $sort stage of the aggregation pipeline.
   *
   * @param schema - The schema of the database collection.
   * @param specs - Specs that define the $sort stage.
   *
   * @returns The aggregation pipeline that handles the generated $sort stage.
   *
   * @example
   * // Returns [{ "$sort": { "a": 1, "b": -1 } }]
   * sort(schema, { a: 1, b: -1 })
   *
   * @see {@link https://docs.mongodb.com/manual/reference/operator/aggregation/sort/}
   */
  static sortStageFactory(schema: Schema, specs: SortStageFactorySpecs): AggregationPipeline {
    const pipe: AggregationPipeline = [];
    pipe.push({ $sort: specs });

    return pipe;
  }

  /**
   * Generates the $project stage of the aggregation pipeline.
   *
   * @param schema - The schema of the database collection.
   * @param options - Additional options.
   *
   * @returns The aggregation pipeline that handles the generated $project stage.
   *
   * @example
   * // Returns [{ "$project": { "_id": "_id", "a": "a", "b": "b", "c": "c", "model": "model" } }]
   * project(schema)
   *
   * @example
   * // Returns [{ "$project": { "foo._id": "bar._id", "foo.a": "bar.a", "foo.b": "bar.b", "foo.c": "bar.c", "foo.model": model.project()[0]["$project"] } }]
   * project(schema, { populate: { 'model': true }, fromPrefix: 'foo.', toPrefix: 'bar.' })
   *
   * @example
   * // Returns [{ "$project": { "_id": "_id", "a": "a", "b": "b", "c": "c", "model": model.project({ "x": "x", "y": "y" })[0]["$project"] } }]
   * project(schema, { populate: { 'model': { 'x': 'x', 'y': 'y' } } })
   *
   * @example
   * // Returns [{ "$project": { "_id": "_id", "b": "b", "c": "c" } }]
   * project(schema, { exclude: ['a', 'model'] })
   *
   * @see {@link https://docs.mongodb.com/manual/reference/operator/aggregation/project/}
   */
  static projectStageFactory(schema: Schema, { toPrefix = '', fromPrefix = '', populate = {}, exclude = [] }: ProjectStageFactoryOptions = {}): AggregationPipeline {
    const fields: { [fieldName: string]: FieldSpecs} = schema.fields;
    const out: { [key: string]: any } = { [`${toPrefix}_id`]: `$${fromPrefix}_id` };

    for (const key in fields) {
      if (!schema.fields.hasOwnProperty(key)) continue;
      if (exclude.indexOf(key) > -1) continue;

      const populateOpts = populate[key];

      if (populateOpts === false) continue;

      const populateRef = fields[key].ref;
      const populateSchema = (!is.nullOrUndefined(populateOpts) && !is.nullOrUndefined(populateRef)) ? getModel(populateRef).schema : undefined;

      out[`${toPrefix}${key}`] = is.nullOrUndefined(populateSchema) ? `$${fromPrefix}${key}` : (Aggregation.projectStageFactory(populateSchema, populateOpts === true ? undefined : populateOpts) as AggregationStageDescriptor[])[0]['$project'];
    }

    if (schema.timestamps) {
      if (exclude.indexOf('updatedAt') < 0) out[`${toPrefix}updatedAt`] = `$${fromPrefix}updatedAt`;
      if (exclude.indexOf('createdAt') < 0) out[`${toPrefix}createdAt`] = `$${fromPrefix}createdAt`;
    }

    return [{ $project: out }];
  }
}
