export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  page?: number;
  size: number;
  first: boolean;
  last: boolean;
}
