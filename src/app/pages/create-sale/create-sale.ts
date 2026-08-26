import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SaleApiService } from '../../core/services/sale-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Service } from '../../core/models/service.model';
import { Product } from '../../core/models/product.model';
import { Client } from '../../core/models/client.model';
import { ClientsStore } from '../../core/state/clients.store';
import { ServicesStore } from '../../core/state/services.store';
import { ProductsStore } from '../../core/state/products.store';
import {
  PAYMENT_METHODS,
  SaleLineGroup,
  buildSalePayload,
  computeSaleTotal,
  createSaleForm,
  createSaleLineGroup,
} from '../../shared/forms/sale-form';

@Component({
  selector: 'app-create-sale',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './create-sale.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSale implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private saleApi = inject(SaleApiService);
  private productApi = inject(ProductApiService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private clientsStore = inject(ClientsStore);
  private servicesStore = inject(ServicesStore);
  private productsStore = inject(ProductsStore);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly form = createSaleForm(this.fb);

  readonly services = signal<Service[]>([]);
  readonly products = signal<Product[]>([]);
  readonly clients = signal<Client[]>([]);
  readonly isSubmitting = signal(false);

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly totalEstimado = computed(() =>
    computeSaleTotal(this.value().lines ?? [], (id) =>
      this.services().find(s => s.id === Number(id))?.price ?? 0
    )
  );

  get lines() { return this.form.controls.lines; }

  ngOnInit(): void {
    this.clientsStore.ensureLoaded().subscribe(clients => this.clients.set(clients));
    this.servicesStore.ensureLoaded().subscribe(services => this.services.set(services.filter(s => s.active)));
    this.productsStore.ensureLoaded().subscribe(products => this.products.set(products));
  }

  addLine() {
    this.lines.push(createSaleLineGroup(this.fb));
  }

  removeLine(index: number) {
    if (this.lines.length === 1) return;
    this.lines.removeAt(index);
  }

  productOf(line: SaleLineGroup): Product | null {
    const id = Number(line.controls.inventoryProductId.value ?? 0);
    if (!id) return null;
    return this.products().find(p => p.id === id) ?? null;
  }

  onProductChange(line: SaleLineGroup) {
    line.controls.inventoryProductVariantId.setValue(null);

    const product = this.productOf(line);
    if (!product?.hasVariants || product.variants?.length || !product.id) return;

    this.productApi.getProductById(product.id).subscribe({
      next: (full) => {
        this.products.update(list =>
          list.map(p => (p.id === product.id ? { ...p, variants: full.variants } : p))
        );
      },
      error: () => this.notification.error('No se pudieron cargar las variantes del producto.'),
    });
  }

  onVariantChange(line: SaleLineGroup) {
    const product = this.productOf(line);
    const variantId = Number(line.controls.inventoryProductVariantId.value ?? 0);
    const variant = product?.variants?.find(v => v.id === variantId) ?? null;
    const price = variant?.purchasePrice ?? product?.purchasePrice;
    if (price) line.controls.unitPrice.setValue(price);
  }

  onServiceChange(line: SaleLineGroup) {
    const service = this.services().find(s => s.id === Number(line.controls.serviceId.value));
    if (service) line.controls.unitPrice.setValue(service.price);
  }

  registerSale() {
    const shared = this.form.getRawValue();

    if (!shared.clientId) {
      this.notification.warning('Debe seleccionar un cliente.');
      return;
    }

    for (const line of this.lines.controls) {
      const v = line.getRawValue();
      if (v.itemType === 'SERVICE' && !v.serviceId) {
        this.notification.warning('Debe seleccionar un servicio en todas las líneas.');
        return;
      }
      if (v.itemType === 'PRODUCT') {
        if (!v.inventoryProductId) {
          this.notification.warning('Debe seleccionar un producto del inventario en todas las líneas.');
          return;
        }
        if (this.productOf(line)?.hasVariants && !v.inventoryProductVariantId) {
          this.notification.warning('Debe seleccionar una variante del producto en todas las líneas.');
          return;
        }
      }
      if (v.quantity <= 0) {
        this.notification.warning('La cantidad debe ser mayor a 0 en todas las líneas.');
        return;
      }
    }

    const requests = this.lines.controls.map(line =>
      this.saleApi.createSale(buildSalePayload(shared, line.getRawValue(), this.productOf(line)))
    );

    this.isSubmitting.set(true);

    forkJoin(requests).subscribe({
      next: () => {
        this.productsStore.refresh().subscribe();
        this.notification.success(`${requests.length} venta(s) registrada(s) correctamente.`, '¡Éxito!');
        this.router.navigate(['/ventas']);
      },
      error: () => this.isSubmitting.set(false),
    });
  }
}
