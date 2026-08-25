import { HttpContextToken } from '@angular/common/http';

/**
 * Cuando está activo, `errorInterceptor` no emite notificación al usuario
 * y se limita a propagar el error al llamante.
 */
export const silentError = new HttpContextToken<boolean>(() => false);
