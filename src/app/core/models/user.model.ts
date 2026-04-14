export enum UserRole {
  ADMIN = 'ADMIN',
  PROFESSIONAL = 'PROFESSIONAL',
  GUEST = 'GUEST'
}

export interface User {
  id?: string;
  name: string;
  displayName?: string;
  role: UserRole;
  email?: string;
  avatar?: string;
  professionalId?: number | null;
  accessToken?: string;
  tokenType?: string;
}
