export interface ClassificationJobResponse {
  bucket_name: string;
  files_processed: string[];
  id: string;
  job_type: string;
  last_updated?: Date;
  end_time?: Date;
  runtime: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  stalled: boolean;
  start_time: Date;
  status: 'PROCESSING' | 'DONE' | 'ERROR' | 'DOWNLOADING';
  total_files_processed: number;
}
