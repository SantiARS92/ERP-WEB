import { Page } from './page.model';

export interface Client {
  id?: number;
  fullName: string;   // matches backend field
  phone: string;
  email?: string | null;
  admiteFacturas?: boolean;
  direccion?: string | null;
  cifNif?: string | null;
  identificador?: number | null;
}

export type ClientPage = Page<Client>;
