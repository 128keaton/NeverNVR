export interface ClassificationResponse {
  annotated_file_name: string;
  bucket_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  job_id: string;
  processed: boolean;
  processed_at: Date;
  tags: string[];
}
