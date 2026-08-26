import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login'], {
      queryParams: state.url !== '/login' ? { redirectTo: state.url } : undefined,
    });
  }

  const requiredRoles = route.data['roles'] as UserRole[] | undefined;
  if (!requiredRoles?.length) {
    return true;
  }

  if (authService.hasRole(requiredRoles)) {
    return true;
  }

  return router.createUrlTree(['/panel']);
};
