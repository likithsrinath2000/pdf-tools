import type { ProcessingJob } from "@shared/schema";

export class APIClient {
  private baseUrl = "/api";

  async createJob(toolId: string, files: File[], options?: any): Promise<{ jobId: string }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('toolId', toolId);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    const response = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create job');
    }

    return response.json();
  }

  async getJob(jobId: string): Promise<ProcessingJob> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get job');
    }

    return response.json();
  }

  async pollJobStatus(
    jobId: string,
    onProgress?: (job: ProcessingJob) => void,
    interval: number = 1000
  ): Promise<ProcessingJob> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getJob(jobId);
          
          if (onProgress) {
            onProgress(job);
          }

          if (job.status === 'completed') {
            resolve(job);
          } else if (job.status === 'failed') {
            reject(new Error(job.error || 'Job failed'));
          } else {
            setTimeout(poll, interval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  getDownloadUrl(jobId: string): string {
    return `${this.baseUrl}/jobs/${jobId}/download`;
  }

  async downloadJob(jobId: string, filename?: string): Promise<void> {
    const downloadUrl = `${this.getDownloadUrl(jobId)}?t=${Date.now()}`;
    const response = await fetch(downloadUrl, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename || `processed_file_${jobId}.pdf`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  }

  async deleteJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete job');
    }
  }
}

export const apiClient = new APIClient();
