import type { DB as EmbeddingsDb } from "../../_generated/embeddings-db";
import logger from "../utils/logger";
import { embeddingsDbPath } from "../utils/constants";
import BaseDatabase from "./base-database";
import { sql } from "kysely";

export class EmbeddingsDatabase extends BaseDatabase<EmbeddingsDb> {
  embeddingsCache: { text: string; embedding: Float32Array }[] = [];
  countEmbeddings = async (): Promise<number> => {
    await this.initialize();
    const result = await this.db
      .selectFrom("embeddings_vec")
      .select((e) => e.fn.count("embeddings_vec.text").as("count"))
      .execute();
    return result[0].count as number;
  };

  calculateSimilarity = async (embedding: Float32Array, limit = 100): Promise<{ text: string; distance: number }[]> => {
    await this.initialize();

    // Convert the vector to a BLOB for SQLite-vec
    const embeddingBuffer = Buffer.from(embedding.buffer);

    const results = await this.db
      .selectFrom("embeddings_vec")
      .select(["text", sql<number>`distance`.as("distance")])
      .where(sql`embedding MATCH ${embeddingBuffer}`)
      .orderBy("distance", "asc")
      .limit(limit)
      .execute();

    return results.map((r) => ({
      text: r.text!,
      distance: r.distance as number,
    }));
  };

  loadVectorsIntoMemory = async () => {
    if (this.embeddingsCache.length) {
      return;
    }
    // TODO: Can deprecate this as we are using index on disk.
    await this.initialize();
  };

  getAllEmbeddings = async () => {
    await this.loadVectorsIntoMemory();
    return this.embeddingsCache;
  };

  embeddingsCacheSize = () => {
    return this.embeddingsCache.length;
  };
  getEmbeddingByText = async (text: string) => {
    await this.initialize();
    const result = await this.db.selectFrom("embeddings_vec").where("text", "=", text).selectAll().executeTakeFirst();
    if (!result) {
      return null;
    }
    const embedding = result.embedding!;
    return {
      text: result.text,
      embedding: new Float32Array(
        embedding.buffer,
        embedding.byteOffset,
        embedding.byteLength / Float32Array.BYTES_PER_ELEMENT,
      ),
    };
  };

  getAllText = async (): Promise<string[]> => {
    await this.initialize();
    const result = await this.db.selectFrom("embeddings_vec").select("text").execute();
    return result.map((l) => l.text!);
  };
  getExistingText = async (text: string[]): Promise<string[]> => {
    await this.initialize();
    const result = await this.db.selectFrom("embeddings_vec").select("text").where("text", "in", text).execute();
    return result.map((l) => l.text!);
  };

  insertEmbeddings = async (embeddings: { input: string; values: number[] }[]) => {
    await this.initialize();
    const values = embeddings.map((e) => {
      const typedBuffer = new Float32Array(e.values);
      const buffer = Buffer.from(typedBuffer.buffer);
      return {
        text: e.input,
        embedding: buffer,
      };
    });
    const insert = this.db
      .insertInto("embeddings_vec")
      .values(values)
      .onConflict((oc) => oc.column("text").doNothing());
    await insert.execute();
  };
}

const embeddingsDb = new EmbeddingsDatabase("Embeddings DB", embeddingsDbPath, async (db) => {
  // create virtual table if not exists
  logger.info("Creating index table");
  await db.exec(`
CREATE TABLE if not exists embeddings (
   text TEXT PRIMARY KEY NOT NULL,
   embedding BLOB NOT NULL
);
CREATE UNIQUE INDEX if not exists idx_embeddings
ON embeddings (text);
      `);
  logger.info("Creating index table done");
});

export default embeddingsDb;
