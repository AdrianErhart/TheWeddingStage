/**
 * Geteiltes Hilfsmodul `mongodb` fuer die Anwendungslogik.
 * Stellt wiederverwendbare Funktionen fuer Domainregeln, Datenzugriff oder Infrastrukturdetails bereit, damit diese zentral gepflegt werden koennen.
 */
import { MongoClient, type Db } from "mongodb";

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

const appCollections = [
  "users",
  "artists",
  "customers",
  "reviews",
  "sessions",
  "bookingRequests",
];

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Create a .env.local file in the project root and restart the dev server."
    );
  }

  let clientPromise = globalThis.mongoClientPromise;

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
    globalThis.mongoClientPromise = clientPromise;
  }

  const client = await clientPromise;
  return dbName ? client.db(dbName) : client.db();
}

export async function ensureAppDatabase(): Promise<{ database: string; collections: string[] }> {
  const db = await getDb();
  const existingCollections = await db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((collection) => collection.name));

  for (const collectionName of appCollections) {
    if (!existingNames.has(collectionName)) {
      await db.createCollection(collectionName);
    }
  }

  return {
    database: db.databaseName,
    collections: appCollections,
  };
}

export async function ensureAppCollections(): Promise<{ database: string; collections: string[] }> {
  const db = await getDb();
  const existingCollections = await db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((c) => c.name));

  for (const collectionName of appCollections) {
    if (!existingNames.has(collectionName)) {
      await db.createCollection(collectionName);
    }
  }

  return { database: db.databaseName, collections: appCollections };
}