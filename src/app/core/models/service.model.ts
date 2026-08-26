import { Category } from './category.model';
import { Page } from './page.model';

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

export type ServicePage = Page<Service>;
