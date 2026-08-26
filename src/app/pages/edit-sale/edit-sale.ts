import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SaleApiService } from '../../core/services/sale-api.service';
import { SaleResponse } from '../../core/models/sale.model';
import { Client } from '../../core/models/client.model';
import { Service } from '../../core/models/service.model';
import { Product } from '../../core/models/product.model';
import { ProductApiService } from '../../core/services/product-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ClientsStore } from '../../core/state/clients.store';
import { ServicesStore } from '../../core/state/services.store';
import { ProductsStore } from '../../core/state/products.store';
import {
  PAYMENT_METHODS,
  buildSalePayload,
  createSingleSaleForm,
  splitSingleSaleValue,
  todayIsoDate,
} from '../../shared/forms/sale-form';

@Component({
  selector: 'app-edit-sale',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-sale.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditSale implements OnInit {
  private saleApi = inject(SaleApiService);
  private productApi = inject(ProductApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private clientsStore = inject(ClientsStore);
  private servicesStore = inject(ServicesStore);
  private productsStore = inject(ProductsStore);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly form = createSingleSaleForm(inject(NonNullableFormBuilder));

  readonly clients = signal<Client[]>([]);
  readonly services = signal<Service[]>([]);
  readonly products = signal<Product[]>([]);
  readonly originalSale = signal<SaleResponse | null>(null);
  readonly isSubmitting = signal(false);

  private saleId = 0;

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly selectedProduct = computed<Product | null>(() => {
    const id = Number(this.value().inventoryProductId ?? 0);
    if (!id) return null;
    return this.products().find(p => p.id === id) ?? null;
  });

  readonly selectedVariant = computed(() => {
    const id = Number(this.value().inventoryProductVariantId ?? 0);
    if (!id) return null;
    return this.selectedProduct()?.variants?.find(v => v.id === id) ?? null;
  });

  readonly totalEstimado = computed(() => {
    const v = this.value();
    const qty = Number(v.quantity ?? 0);
    const servicePrice = this.services().find(s => s.id === Number(v.serviceId))?.price ?? 0;
    const price = Number(v.unitPrice ?? 0) || (v.itemType === 'SERVICE' ? servicePrice : 0);
    return qty * price;
  });

  readonly stockRestante = computed(() => {
    const v = this.value();
    const product = this.selectedProduct();
    if (v.itemType !== 'PRODUCT' || !product) return 0;
    const variant = this.selectedVariant();
    const currentStock = variant ? variant.stock : product.stock;
    const originalQty = this.originalSale()?.quantity ?? 0;
    return Math.max(0, currentStock + originalQty - Number(v.quantity ?? 0));
  });

  readonly isFromAppointment = computed(() => this.originalSale()?.sourceType === 'APPOINTMENT');

  ngOnInit() {
    this.clientsStore.ensureLoaded().subscribe(clients => this.clients.set(clients));
    this.servicesStore.ensureLoaded().subscribe(services => this.services.set(services.filter(s => s.active)));
    this.productsStore.ensureLoaded().subscribe(products => this.products.set(products));

    this.saleId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.saleId) return;

    this.saleApi.getSaleById(this.saleId).subscribe({
      next: (data) => {
        this.originalSale.set(data);
        this.form.setValue({
          clientId: data.clientId,
          paymentMethod: data.paymentMethod ?? 'CASH',
          saleDate: data.saleDate ?? todayIsoDate(),
          notes: data.notes ?? '',
          itemType: data.itemType,
          serviceId: data.serviceId,
          inventoryProductId: data.inventoryProductId,
          inventoryProductVariantId: data.inventoryProductVariantId ?? null,
          unitPrice: data.unitPrice,
          quantity: data.quantity,
        });

        if (data.inventoryProductId) this.ensureVariantsLoaded(data.inventoryProductId);
      },
      error: (err: { status: number }) => {
        if (err.status === 404) this.notification.error('Venta no encontrada', 'No existe');
        this.router.navigate(['/ventas']);
      }
    });
  }

  private ensureVariantsLoaded(productId: number) {
    const product = this.products().find(p => p.id === productId);
    if (!product?.hasVariants || product.variants?.length) return;

    this.productApi.getProductById(productId).subscribe({
      next: (full) => {
        this.products.update(list =>
          list.map(p => (p.id === productId ? { ...p, variants: full.variants } : p))
        );
      },
      error: () => this.notification.error('No se pudieron cargar las variantes del producto.'),
    });
  }

  onProductChange() {
    this.form.controls.inventoryProductVariantId.setValue(null);
    const id = Number(this.form.controls.inventoryProductId.value ?? 0);
    if (id) this.ensureVariantsLoaded(id);
  }

  onVariantChange() {
    const price = this.selectedVariant()?.purchasePrice ?? this.selectedProduct()?.purchasePrice;
    if (price) this.form.controls.unitPrice.setValue(price);
  }

  onServiceChange() {
    const service = this.services().find(s => s.id === Number(this.form.controls.serviceId.value));
    if (service && !this.form.controls.unitPrice.value) {
      this.form.controls.unitPrice.setValue(service.price);
    }
  }

  saveSale() {
    if (this.isFromAppointment()) {
      this.notification.warning('No se pueden modificar las ventas generadas automáticamente desde citas.');
      return;
    }

    const raw = this.form.getRawValue();

    if (!raw.clientId) { this.notification.warning('Debe seleccionar un cliente.'); return; }
    if (raw.itemType === 'SERVICE' && !raw.serviceId) { this.notification.warning('Debe seleccionar un servicio.'); return; }
    if (raw.itemType === 'PRODUCT' && !raw.inventoryProductId) { this.notification.warning('Debe seleccionar un producto del inventario.'); return; }
    if (raw.quantity <= 0) { this.notification.warning('La cantidad debe ser mayor a 0.'); return; }

    const { shared, line } = splitSingleSaleValue(raw);
    const payload = buildSalePayload(shared, line, this.selectedProduct());

    this.isSubmitting.set(true);
    this.saleApi.updateSale(this.saleId, payload).subscribe({
      next: () => {
        this.productsStore.refresh().subscribe();
        this.notification.success('Venta actualizada correctamente.', '¡Éxito!');
        this.router.navigate(['/ventas']);
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  async deleteSale() {
    if (this.isFromAppointment()) {
      this.notification.warning('No se pueden eliminar las ventas vinculadas a una cita. Cancele la cita para anular la venta.');
      return;
    }

    const confirmed = await this.confirm.ask('¿Está seguro de eliminar permanentemente esta venta manual?', {
      title: 'Eliminar venta',
      confirmText: 'Eliminar',
      danger: true,
    });

    if (!confirmed) return;

    this.saleApi.deleteSale(this.saleId).subscribe({
      next: () => {
        this.productsStore.refresh().subscribe();
        this.notification.success('Venta eliminada de los registros.', 'Eliminada');
        this.router.navigate(['/ventas']);
      },
      error: () => this.notification.error('Ocurrió un error al eliminar la venta.')
    });
  }
}
