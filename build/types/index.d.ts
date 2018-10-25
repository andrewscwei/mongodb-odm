import { IndexOptions, ObjectID, UpdateQuery } from 'mongodb';
export declare type Document<T = {}> = Partial<T> & {
    _id?: ObjectID;
    createdAt?: Date;
    updatedAt?: Date;
    [field: string]: FieldValue;
};
export declare type Query<T = {}> = string | ObjectID | Document<T> | {
    [key: string]: any;
};
export declare type Update<T = {}> = UpdateQuery<Document<T>>;
export declare type FieldType = typeof ObjectID | typeof String | typeof Number | typeof Boolean | typeof Date | typeof Array | (typeof Number)[] | {
    [key: string]: FieldSpecs;
};
export declare type FieldValue = undefined | ObjectID | string | number | boolean | Date | any[] | {
    [key: string]: FieldValue;
};
export declare type FieldFormatFunction = (value: any) => FieldValue;
export declare type FieldValidationStrategy = RegExp | number | any[] | FieldValidationFunction;
export declare type FieldValidationFunction = (value: any) => boolean;
export declare type FieldRandomValueFunction = () => FieldValue;
export declare type FieldDefaultValueFunction = () => FieldValue;
export interface FieldSpecs {
    type: FieldType;
    ref?: string;
    required?: boolean;
    encrypted?: boolean;
    default?: FieldValue | FieldDefaultValueFunction;
    format?: FieldFormatFunction;
    validate?: FieldValidationStrategy;
    random?: FieldRandomValueFunction;
}
export interface Schema<T = {}> {
    model: string;
    collection: string;
    timestamps?: boolean;
    cascade?: string[];
    fields: {
        [K in keyof T]: FieldSpecs;
    };
    indexes?: SchemaIndex[];
}
export interface SchemaIndex {
    spec: {
        [key: string]: any;
    };
    options?: IndexOptions;
}
export declare function typeIsUpdate<T = {}>(value: any): value is Update<T>;
export declare type AggregationPipeline = (MatchStageDescriptor | LookupStageDescriptor | UnwindStageDescriptor | GroupStageDescriptor | SortStageDescriptor | ProjectStageDescriptor | SampleStageDescriptor)[];
export interface PipelineFactoryOptions {
    prefix?: string;
    pipeline?: AggregationPipeline;
}
export interface PipelineFactorySpecs {
    $lookup?: LookupStageFactorySpecs;
    $match?: MatchStageFactorySpecs;
    $prune?: MatchStageFactorySpecs;
    $group?: GroupStageFactorySpecs;
    $sort?: SortStageFactorySpecs;
}
export declare type MatchStageFactorySpecs = Query;
export interface MatchStageFactoryOptions {
    prefix?: string;
}
export interface MatchStageDescriptor {
    $match: {
        [key: string]: any;
    };
}
export interface LookupStageFactorySpecs {
    [modelName: string]: boolean | LookupStageFactorySpecs;
}
export interface LookupStageFactoryOptions {
    fromPrefix?: string;
    toPrefix?: string;
}
export interface LookupStageDescriptor {
    $lookup: {
        [key: string]: any;
    };
}
export interface UnwindStageDescriptor {
    $unwind: {
        [key: string]: any;
    };
}
export declare type GroupStageFactorySpecs = string | {
    [key: string]: any;
};
export interface GroupStageDescriptor {
    $group: {
        [key: string]: any;
    };
}
export interface SortStageFactorySpecs {
    [key: string]: any;
}
export interface SortStageDescriptor {
    $sort: {
        [key: string]: any;
    };
}
export interface SampleStageDescriptor {
    $sample: {
        [key: string]: any;
    };
}
export interface ProjectStageFactoryOptions {
    toPrefix?: string;
    fromPrefix?: string;
    populate?: ProjectStageFactoryOptionsPopulate;
    exclude?: any[];
}
export interface ProjectStageFactoryOptionsPopulate {
    [modelName: string]: boolean | ProjectStageFactoryOptionsPopulate;
}
export interface ProjectStageDescriptor {
    $project: {
        [key: string]: any;
    };
}
