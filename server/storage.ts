import { processingJobs, type ProcessingJob, type InsertProcessingJob } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  getJob(id: string): Promise<ProcessingJob | undefined>;
  updateJobStatus(id: string, status: string, progress?: number): Promise<void>;
  updateJobOutput(id: string, outputFile: string): Promise<void>;
  updateJobError(id: string, error: string): Promise<void>;
  getRecentJobs(limit?: number): Promise<ProcessingJob[]>;
  deleteJob(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const [job] = await db
      .insert(processingJobs)
      .values(insertJob)
      .returning();
    return job;
  }

  async getJob(id: string): Promise<ProcessingJob | undefined> {
    const [job] = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.id, id));
    return job || undefined;
  }

  async updateJobStatus(id: string, status: string, progress?: number): Promise<void> {
    const updateData: any = { status };
    if (progress !== undefined) {
      updateData.progress = progress;
    }
    if (status === "completed" || status === "failed") {
      updateData.completedAt = new Date();
    }
    await db
      .update(processingJobs)
      .set(updateData)
      .where(eq(processingJobs.id, id));
  }

  async updateJobOutput(id: string, outputFile: string): Promise<void> {
    await db
      .update(processingJobs)
      .set({ outputFile, status: "completed", progress: 100, completedAt: new Date() })
      .where(eq(processingJobs.id, id));
  }

  async updateJobError(id: string, error: string): Promise<void> {
    await db
      .update(processingJobs)
      .set({ error, status: "failed", completedAt: new Date() })
      .where(eq(processingJobs.id, id));
  }

  async getRecentJobs(limit: number = 50): Promise<ProcessingJob[]> {
    return await db
      .select()
      .from(processingJobs)
      .orderBy(desc(processingJobs.createdAt))
      .limit(limit);
  }

  async deleteJob(id: string): Promise<void> {
    await db
      .delete(processingJobs)
      .where(eq(processingJobs.id, id));
  }
}

export const storage = new DatabaseStorage();
