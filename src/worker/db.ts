import { APODData, ClassificationResult } from './types';

export class Database {
  private d1: D1Database;
  private vectorizeIndex: VectorizeIndex;
  private r2Bucket: R2Bucket;

  constructor(d1: D1Database, vectorizeIndex: VectorizeIndex, r2Bucket: R2Bucket) {
    this.d1 = d1;
    this.vectorizeIndex = vectorizeIndex;
    this.r2Bucket = r2Bucket;
  }

  async storeAPODData(apodData: APODData, result: ClassificationResult, imageBlob: Blob, llavaDesc: string, objects: string[]): Promise<void> {
    const r2Key = `${apodData.date}.jpg`;
    await this.r2Bucket.put(r2Key, imageBlob);

    try {
      const insertResult = await this.d1.prepare(`
        INSERT OR REPLACE INTO apod_metadata
        (date, title, explanation, image_url, r2_url, category, confidence, image_description, copyright, processed_at, is_relevant, llava_desc, objects)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        apodData.date,
        apodData.title,
        apodData.explanation,
        apodData.hdurl || apodData.url,
        r2Key,
        result.category,
        result.confidence,
        result.imageDescription,
        apodData.copyright || null,
        new Date().toISOString(),
        1, // 1 for true
        llavaDesc,
        JSON.stringify(objects)
      ).run();

      if (!insertResult.success) {
        throw new Error(`D1 insert failed: ${insertResult.error || 'Unknown error'}`);
      }

      const vector = {
        id: apodData.date,
        values: result.embeddings,
        metadata: {
          date: apodData.date,
          title: apodData.title,
          category: result.category,
          confidence: result.confidence,
          llava_desc: llavaDesc,
          objects: JSON.stringify(objects)
        },
      };

      await this.vectorizeIndex.upsert([vector]);

    } catch (error) {
      await this.r2Bucket.delete(r2Key).catch(() => {});
      await this.d1.prepare('DELETE FROM apod_metadata WHERE date = ?')
        .bind(apodData.date)
        .run()
        .catch(() => {});

      throw error;
    }
  }

  async isAlreadyProcessed(date: string): Promise<boolean> {
    try {
      const result = await this.d1.prepare(
        'SELECT date FROM apod_metadata WHERE date = ? LIMIT 1'
      ).bind(date).first();

      return !!result;
    } catch (error) {
      console.warn(`Error checking if ${date} is already processed: ${error}`);
      return false;
    }
  }

  async getImagesByIds(ids: string[]): Promise<any[]> {
    if (ids.length === 0) {
      return [];
    }
    const placeholders = ids.map(() => '?').join(', ');
    const query = `SELECT * FROM apod_metadata WHERE date IN (${placeholders}) ORDER BY date DESC`;
    const { results } = await this.d1.prepare(query).bind(...ids).all();
    return results || [];
  }

  async getAllImages(page: number = 1, limit: number = 10): Promise<any[]> {
    const offset = (page - 1) * limit;
    const query = `SELECT * FROM apod_metadata ORDER BY date DESC LIMIT ? OFFSET ?`;
    const { results } = await this.d1.prepare(query).bind(limit, offset).all();
    return results || [];
  }

  async getImageByDate(date: string): Promise<any> {
    const { results } = await this.d1.prepare('SELECT * FROM apod_metadata WHERE date = ?').bind(date).all();
    return results && results.length > 0 ? results[0] : null;
  }

  async searchAPODDataByKeyword(query: string, page: number = 1, limit: number = 10): Promise<any[]> {
    const offset = (page - 1) * limit;
    const searchQuery = `%${query.toLowerCase()}%`;
    const { results } = await this.d1.prepare(`
      SELECT *
      FROM apod_metadata
      WHERE
        LOWER(title) LIKE ? OR
        LOWER(explanation) LIKE ? OR
        LOWER(image_description) LIKE ? OR
        LOWER(llava_desc) LIKE ? OR
        LOWER(objects) LIKE ?
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `).bind(
      searchQuery,
      searchQuery,
      searchQuery,
      searchQuery,
      searchQuery,
      limit,
      offset
    ).all();
    return results || [];
  }
}
