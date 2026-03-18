export interface Client {
  id?: number;
  fullName: string;   // matches backend field
  phone: string;
  email?: string | null;
}

export interface ClientPage {
  content: Client[];
  page: number;           // current page index (0-based)
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
