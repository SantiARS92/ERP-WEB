import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';
import { filter, map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isInitialized$.pipe(
    filter(initialized => initialized),
    take(1),
    map(() => {
      // 1. Basic Auth Check
      if (!authService.isLoggedIn()) {
        return router.createUrlTree(['/login']);
      }

      // 2. Role Check
      const requiredRoles = route.data['roles'] as Array<UserRole>;
      
      // If no roles are required, allow access
      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      // Check if user has permission
      if (authService.hasRole(requiredRoles)) {
        return true;
      }

      // If not authorized, redirect to dashboard (or a forbidden page)
      return router.createUrlTree(['/panel']);
    })
  );
};
