export interface ConcatJobResponse {
  bucket_name: string;
  id: string;
  job_type: string;
  last_updated?: Date;
  end_time?: Date;
  end_date: Date;
  runtime: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  stalled: boolean;
  start_time: Date;
  start_date: Date;
  status: 'PROCESSING' | 'DONE' | 'ERROR' | 'DOWNLOADING';
  total_files_processed: number;
  output_file?: string;
}
