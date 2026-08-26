import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { Appointment } from '../../core/models/appointment.model';
import { Product } from '../../core/models/product.model';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { from, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  imports: [NgClass, RouterLink],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private appointmentApi = inject(AppointmentApiService);
  private clientApi = inject(ClientApiService);
  private productApi = inject(ProductApiService);
  public themeService = inject(ThemeService);
  public authService = inject(AuthService);
  readonly canCreateAppointments = computed(() => this.authService.currentUser()?.role !== UserRole.GUEST);

  private readonly citasHoyCountSignal = signal(0);
  private readonly porConfirmarCountSignal = signal(0);
  private readonly clientesNuevosCountSignal = signal(0);
  private readonly topServiceSignal = signal('Limpieza Facial');
  private readonly topServicePercentageSignal = signal('45%');
  private readonly sinStockCountSignal = signal(0);
  private readonly pocoStockCountSignal = signal(0);
  private readonly stockSuficienteCountSignal = signal(0);
  private readonly proximasCitasSignal = signal<Appointment[]>([]);

  // Stats Resumen Operativo
  get citasHoyCount() { return this.citasHoyCountSignal(); }
  set citasHoyCount(value: number) { this.citasHoyCountSignal.set(value); }
  get porConfirmarCount() { return this.porConfirmarCountSignal(); }
  set porConfirmarCount(value: number) { this.porConfirmarCountSignal.set(value); }
  get clientesNuevosCount() { return this.clientesNuevosCountSignal(); }
  set clientesNuevosCount(value: number) { this.clientesNuevosCountSignal.set(value); }
  get topService() { return this.topServiceSignal(); }
  set topService(value: string) { this.topServiceSignal.set(value); }
  get topServicePercentage() { return this.topServicePercentageSignal(); }
  set topServicePercentage(value: string) { this.topServicePercentageSignal.set(value); }

  // Alertas
  get sinStockCount() { return this.sinStockCountSignal(); }
  set sinStockCount(value: number) { this.sinStockCountSignal.set(value); }
  get pocoStockCount() { return this.pocoStockCountSignal(); }
  set pocoStockCount(value: number) { this.pocoStockCountSignal.set(value); }
  get stockSuficienteCount() { return this.stockSuficienteCountSignal(); }
  set stockSuficienteCount(value: number) { this.stockSuficienteCountSignal.set(value); }

  // Próximas Citas Table
  get proximasCitas() { return this.proximasCitasSignal(); }
  set proximasCitas(value: Appointment[]) { this.proximasCitasSignal.set(value); }
  
  // Date tracking
  todayStr = '';

  ngOnInit() {
    const today = new Date();
    this.todayStr = this.formatDate(today);
    this.loadAppointmentsData();
    this.loadClientsData();
    this.loadInventoryData();
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private loadAppointmentsData() {
    this.appointmentApi.getAppointments(this.todayStr, this.todayStr).subscribe({
      next: (data) => {
        this.citasHoyCount = data.length;
        this.proximasCitas = data.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime)).slice(0, 5);
        this.porConfirmarCount = data.filter(a => a.status === 'PENDING').length;
        
        // Calculate Top Service roughly based on today
        if (data.length > 0) {
          const serviceCounts = data.reduce((acc, curr) => {
            acc[curr.serviceName || ''] = (acc[curr.serviceName || ''] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          let maxSrv = 'Limpieza Facial';
          let maxCount = 0;
          for (const [srv, count] of Object.entries(serviceCounts)) {
            if (count > maxCount && srv !== '') {
              maxCount = count;
              maxSrv = srv;
            }
          }
          this.topService = maxSrv;
          this.topServicePercentage = Math.round((maxCount / data.length) * 100) + '%';
        }
      },
      error: (err) => console.error('Error fetching appointments', err)
    });
  }

  private loadClientsData() {
    this.clientApi.getClients({ size: 1 }).subscribe({
      next: (res) => {
        this.clientesNuevosCount = res.totalElements; // Approximate total clients as new to show something
      },
      error: (err) => console.error('Error fetching clients', err)
    });
  }

  // TODO(api): mitigación temporal del N+1 (plan §1.10). Resolución definitiva en §7.4:
  // que `GET /api/products` devuelva las variantes embebidas y desaparezca esta cascada.
  private loadInventoryData() {
    this.productApi.getProducts({ size: 1000 }).subscribe({
      next: (res) => {
        const variantProducts = res.content.filter(p => p.hasVariants && p.id !== undefined);

        if (variantProducts.length > 0) {
          from(variantProducts).pipe(
            mergeMap(
              p => this.productApi.getProductById(p.id as number).pipe(catchError(() => of(p))),
              4
            ),
            toArray()
          ).subscribe({
            next: (fullProducts) => {
              const allProducts = res.content.map(p => {
                const fullP = fullProducts.find(fp => fp.id === p.id);
                return fullP ? fullP : p;
              });
              this.calculateStockAlerts(allProducts);
            },
            error: (err) => {
              console.error('Error fetching variants', err);
              this.calculateStockAlerts(res.content);
            }
          });
        } else {
          this.calculateStockAlerts(res.content);
        }
      },
      error: (err) => console.error('Error fetching products', err)
    });
  }

  private calculateStockAlerts(products: Product[]) {
    let sinStock = 0;
    let pocoStock = 0;
    let suficienteStock = 0;

    products.forEach(p => {
      if (p.hasVariants && p.variants && p.variants.length > 0) {
        p.variants.forEach(v => {
          if (v.stock <= 0) {
            sinStock++;
          } else if (v.stock <= (v.minimumStock || 0)) {
            pocoStock++;
          } else {
            suficienteStock++;
          }
        });
      } else if (!p.hasVariants) {
        if (p.status === 'OUT_OF_STOCK' || p.stock <= 0) {
          sinStock++;
        } else if (p.status === 'LOW_STOCK' || p.stock <= (p.minimumStock || 0)) {
          pocoStock++;
        } else {
          suficienteStock++;
        }
      }
    });

    this.sinStockCount = sinStock;
    this.pocoStockCount = pocoStock;
    this.stockSuficienteCount = suficienteStock;
  }

  getAppointmentStatusClass(status: string): string {
    if (status === 'CONFIRMED') {
      return 'bg-emerald-100 text-emerald-700';
    } else if (status === 'PENDING') {
      return 'bg-orange-100 text-orange-700';
    } else if (status === 'CANCELLED') {
      return 'bg-slate-100 text-slate-700';
    }
    return 'bg-blue-100 text-blue-700';
  }

  getAppointmentStatusLabel(status: string): string {
    if (status === 'CONFIRMED') return 'Confirmada';
    if (status === 'PENDING') return 'Pendiente';
    if (status === 'CANCELLED') return 'Cancelada';
    return status;
  }

  formatTimeAMPM(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }
}
