/**
 * @file Database configuration file. This file exports methods to interact with
 *       the MongoClient instance.
 */

import debug from 'debug';
import { Db, MongoClient, MongoError } from 'mongodb';
import Model from './core/Model';

const log = debug('mongodb-odm');

export interface Configuration {
  host: string;
  name: string;
  username?: string;
  password?: string;
  models?: { [modelName: string]: typeof Model};
}

let client: MongoClient;

let options: Configuration;

// Be sure to disconnect the database if the app terminates.
process.on('SIGINT', async () => {
  if (client) {
    await disconnect();
    log('MongoDB client disconnected due to app termination');
  }

  process.exit(0);
});

/**
 * Configures the ODM.
 *
 * @param descriptor - Configuration descriptor.
 */
export function configure(descriptor: Configuration) {
  options = descriptor;
}

/**
 * Establishes a new connection to the database based on the initialized
 * configuration. If there already exists one, this method does nothing.
 *
 * @return No fulfillment value.
 */
export async function connect(): Promise<void> {
  if (client && client.isConnected) return;

  if (!options) throw new Error('You must configure connection options by calling #configure()');

  // Resolve the authentication string.
  const authentication = (options.username && options.password) ? `${options.username}:${options.password}` : undefined;

  // Database client URL.
  const url = `mongodb://${authentication ? `${authentication}@` : ''}${options.host}/${options.name}`;

  client = await MongoClient.connect(url, {
    useNewUrlParser: true,
  });

  const connection = client.db(options.name);

  log('MongoDB client is open:', url);

  connection.on('authenticated', () => {
    log('MongoDB servers authenticated');
  });

  connection.on('close', (err: MongoError) => {
    log('MongoDB client closed because:', err);
  });

  connection.on('error', (err: MongoError) => {
    log('MongoDB client error:', err);
  });

  connection.on('fullsetup', () => {
    log('MongoDB full setup complete');
  });

  connection.on('parseError', (err: MongoError) => {
    log('MongoDB parse error:', err);
  });

  connection.on('reconnect', () => {
    log('MongoDB reconnected');
  });

  connection.on('timeout', (err: MongoError) => {
    log('MongoDB client timed out:', err);
  });
}

/**
 * Disconnects the existing database client.
 *
 * @return No fulfillment value.
 */
export async function disconnect(): Promise<void> {
  if (!client) return;
  await client.close();
}

/**
 * Checks if the database client is established.
 *
 * @return `true` if connected, `false` otherwise.
 */
export function isConnected(): boolean {
  if (!client) return false;
  if (!client.isConnected) return false;
  return true;
}

/**
 * Gets the database instance from the client.
 *
 * @return The database instance as the fulfillment value.
 */
export async function getInstance(): Promise<Db> {
  if (client) return client.db(options.name);

  log('There is no MongoDB client, establishing one now...');

  await connect();

  return getInstance();
}

/**
 * Gets a model class by its name or collection name.
 *
 * @param modelOrCollectionName - Model or collection name.
 *
 * @return The model class.
 */
export function getModel(modelOrCollectionName: string): typeof Model {
  const models = options.models;

  if (models) {
    if (models.hasOwnProperty(modelOrCollectionName)) return models[modelOrCollectionName];

    for (const key in models) {
      if (!models.hasOwnProperty(key)) continue;

      const ModelClass = models[key];

      if (ModelClass.schema.collection === modelOrCollectionName) return ModelClass;
    }
  }

  throw new Error(`No model found for model/collection name ${modelOrCollectionName}`);
}