import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { silentError } from '../http/http-contexts';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ha ocurrido un error inesperado';
      let errorTitle = 'Error del Servidor';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
        errorTitle = 'Error de Red';
      } else {
        // Server-side error
        if (error.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
          errorTitle = 'Error de Conexión';
        } else if (error.status === 401) {
          errorMessage = 'Sesión expirada o credenciales incorrectas.';
          errorTitle = 'No Autorizado';
        } else if (error.status === 403) {
          errorMessage = 'No tienes permisos para realizar esta acción.';
          errorTitle = 'Acceso Denegado';
        } else if (error.status === 404) {
          errorMessage = 'El recurso solicitado no existe.';
          errorTitle = 'No Encontrado';
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        }
      }
      if (!req.context.get(silentError)) {
        notificationService.error(errorMessage, errorTitle);
      }

      return throwError(() => error);
    })
  );
};

