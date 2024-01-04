export interface NovuPaginationResponse<T> {
  data: T[];
  page: number;
  totalCount: number;
  pageSize: number;
}
