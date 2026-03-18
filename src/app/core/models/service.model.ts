import { Category } from './category.model';

export interface Service {
  id?: number;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  active: boolean;
  category?: Category; // For GET responses
  categoryId?: number; // For POST/PUT requests
}

export interface ServicePage {
  content: Service[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
