import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { TimeoutError, throwError, timeout } from 'rxjs';
import { requestTimeout } from '../http/http-contexts';

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const timeoutMs = req.context.get(requestTimeout);

  return next(req).pipe(
    timeout({
      each: timeoutMs,
      with: () => throwError(() => new HttpErrorResponse({
        status: 0,
        statusText: 'Request Timeout',
        url: req.url,
        error: new TimeoutError(),
      })),
    })
  );
};
