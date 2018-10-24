import assert from 'assert';
import { describe, it } from 'mocha';
import { ObjectID } from 'mongodb';
import * as db from '../..';
import Baz, { BazDocument } from '../models/Baz';
import Foo from '../models/Foo';

db.configure({
  host: 'localhost:27017',
  name: 'mongodb_odm_test',
});

describe('core/Model', () => {
  before(async () => {
    await (await db.getInstance()).dropDatabase();
  });

  it('throws an error if the model has no schema defined', async () => {
    assert(Foo.schema);
  });

  it('can insert a new document', async () => {
    const t: Partial<BazDocument> = { aString: 'foo' };
    const doc = await Baz.insertOne<BazDocument>(t);

    assert(doc);
    assert(ObjectID.isValid(doc!._id!));
    assert(doc!.aString === t.aString);
  });

  it('can insert multiple documents', async () => {
    const t: Partial<BazDocument>[] = [{ aString: 'a' }, { aString: 'b' }, { aString: 'c' }];
    const docs = await Baz.insertMany<BazDocument>(t);

    assert(docs);
    assert(docs!.reduce((prev, curr) => prev && ObjectID.isValid(curr._id!), true));

    docs!.forEach((doc, i) => assert(doc.aString === t[i].aString));
  });

  it('should throw if required fields are missing during insertion', async () => {
    let didThrow = true;

    try {
      await Baz.insertOne({ aNumber: 6 }).catch(err => { throw err; });
      didThrow = false;
    }
    catch (err) {}

    assert(didThrow);
  });

  it('can format documents according to the schema', async () => {
    const t: Partial<BazDocument> = { aFormattedString: 'foo' };
    const f = await Baz.formatDocument(t);

    assert(Baz.schema.fields.aFormattedString.format!(t.aFormattedString) === f.aFormattedString);
  });

  // it('can encrypt document fields according to the schema', async () => {

  // });

  // it('should automatically generate default values on insert', async () => {
  //   const doc = await ExampleModel.insertOne({ aString: 'foo' });
  //   assert(doc!.aBoolean === ExampleSchema.fields.aBoolean.default);
  // });

  // it('should automatically format values on insert according to the schema', async () => {
  // });

  // it('should automatically format values on update according to the schema', async () => {

  // });

  // it('should automatically format values on upsert according to the schema', async () => {

  // });

  // it('can find a document', async () => {

  // });

  // it('can find multiple documents', async () => {

  // });

  // it('can find a random document', async () => {

  // });

  // it('can count the total number of documents in the collection', async () => {

  // });

  // it('can generate random required fields', async () => {

  // });
});
