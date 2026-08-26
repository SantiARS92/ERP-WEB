import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SaleApiService } from '../../core/services/sale-api.service';
import { SaleRequest, SaleResponse } from '../../core/models/sale.model';
import { Client } from '../../core/models/client.model';
import { Service } from '../../core/models/service.model';
import { Product, InventoryVariant } from '../../core/models/product.model';
import { ProductApiService } from '../../core/services/product-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ClientsStore } from '../../core/state/clients.store';
import { ServicesStore } from '../../core/state/services.store';
import { ProductsStore } from '../../core/state/products.store';

@Component({
  selector: 'app-edit-sale',
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './edit-sale.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditSale implements OnInit {
  private readonly saleSignal = signal<SaleRequest>({
    clientId: undefined,
    itemType: 'SERVICE',
    quantity: 1,
    paymentMethod: 'CASH'
  });
  
  originalSale: SaleResponse | undefined;
  saleId!: number;
  private readonly clientsSignal = signal<Client[]>([]);
  private readonly servicesSignal = signal<Service[]>([]);
  private readonly productsSignal = signal<Product[]>([]);
  private readonly selectedClientSignal = signal<Client | null>(null);
  private readonly selectedProductSignal = signal<Product | null>(null);
  private readonly selectedServiceSignal = signal<Service | null>(null);
  private readonly selectedVariantSignal = signal<InventoryVariant | null>(null);

  totalEstimado = 0;
  stockRestante = 0;
  private readonly isSubmittingSignal = signal(false);

  private saleApi = inject(SaleApiService);
  private productApi = inject(ProductApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmService);
  private clientsStore = inject(ClientsStore);
  private servicesStore = inject(ServicesStore);
  private productsStore = inject(ProductsStore);

  get sale() { return this.saleSignal(); }
  set sale(value: SaleRequest) { this.saleSignal.set(value); }
  get clients() { return this.clientsSignal(); }
  set clients(value: Client[]) { this.clientsSignal.set(value); }
  get services() { return this.servicesSignal(); }
  set services(value: Service[]) { this.servicesSignal.set(value); }
  get products() { return this.productsSignal(); }
  set products(value: Product[]) { this.productsSignal.set(value); }
  get selectedClient() { return this.selectedClientSignal(); }
  set selectedClient(value: Client | null) { this.selectedClientSignal.set(value); }
  get selectedProduct() { return this.selectedProductSignal(); }
  set selectedProduct(value: Product | null) { this.selectedProductSignal.set(value); }
  get selectedService() { return this.selectedServiceSignal(); }
  set selectedService(value: Service | null) { this.selectedServiceSignal.set(value); }
  get selectedVariant() { return this.selectedVariantSignal(); }
  set selectedVariant(value: InventoryVariant | null) { this.selectedVariantSignal.set(value); }
  get isSubmitting() { return this.isSubmittingSignal(); }
  set isSubmitting(value: boolean) { this.isSubmittingSignal.set(value); }

  ngOnInit() {
    this.clientsStore.ensureLoaded().subscribe((clients) => this.clients = clients);
    this.servicesStore.ensureLoaded().subscribe((services) => this.services = services.filter((service) => service.active));
    this.productsStore.ensureLoaded().subscribe((products) => this.products = products);
    
    this.saleId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.saleId) {
      this.saleApi.getSaleById(this.saleId).subscribe({
        next: (data) => {
          this.originalSale = data;
          this.sale = {
            clientId: data.clientId,
            itemType: data.itemType,
            inventoryProductId: data.inventoryProductId,
            serviceId: data.serviceId,
            itemName: data.itemName,
            unitPrice: data.unitPrice,
            quantity: data.quantity,
            paymentMethod: data.paymentMethod,
            saleDate: data.saleDate,
            notes: data.notes,
            inventoryProductVariantId: data.inventoryProductVariantId
          };
          
          if (this.sale.inventoryProductId) {
            this.onProductChange(true);
          } else if (this.sale.serviceId) {
            this.onServiceChange();
          }
          
          this.onClientChange();
          this.calculateSummary();
        },
        error: (err) => {
          if (err.status === 404) this.notification.error('Venta no encontrada', 'No existe');
          this.router.navigate(['/ventas']);
        }
      });
    }
  }

  onProductChange(isInitialLoad = false) {
    const productId = Number(this.sale.inventoryProductId);
    if (!productId) {
      this.selectedProduct = null;
      this.selectedVariant = null;
      this.sale.inventoryProductVariantId = null;
      return;
    }

    const product = this.products.find(p => p.id === productId);
    if (product) {
      this.selectedProduct = product;
      
      if (!isInitialLoad) {
        this.selectedVariant = null;
        this.sale.inventoryProductVariantId = null;
      }

      if (product.hasVariants && (!product.variants || product.variants.length === 0)) {
        this.productApi.getProductById(productId).subscribe({
          next: (fullProduct) => {
            product.variants = fullProduct.variants;
            if (isInitialLoad && this.sale.inventoryProductVariantId) {
                this.onVariantChange();
            }
          },
          error: (err) => console.error('Error loading product details:', err)
        });
      } else if (isInitialLoad && this.sale.inventoryProductVariantId) {
          this.onVariantChange();
      }
    }
    this.calculateSummary();
  }

  onVariantChange() {
    const variantId = Number(this.sale.inventoryProductVariantId);
    if (this.selectedProduct && variantId) {
      this.selectedVariant = this.selectedProduct.variants?.find(v => v.id === variantId) || null;
      if (this.selectedVariant && this.selectedVariant.purchasePrice) {
          this.sale.unitPrice = this.selectedVariant.purchasePrice;
      } else if (this.selectedProduct.purchasePrice) {
          this.sale.unitPrice = this.selectedProduct.purchasePrice;
      }
    } else {
      this.selectedVariant = null;
    }
    this.calculateSummary();
  }

  onClientChange() {
    this.selectedClient = this.clients.find(c => c.id === Number(this.sale.clientId)) || null;
  }

  onServiceChange() {
    this.selectedService = this.services.find(s => s.id === Number(this.sale.serviceId)) || null;
    this.calculateSummary();
  }

  calculateSummary() {
    const qty = this.sale.quantity || 0;
    let price = this.sale.unitPrice || 0;

    if (!this.sale.unitPrice && this.sale.itemType === 'SERVICE' && this.selectedService) {
        price = this.selectedService.price;
    }

    this.totalEstimado = qty * price;

    if (this.sale.itemType === 'PRODUCT' && this.selectedProduct) {
        const currentStock = this.selectedVariant ? this.selectedVariant.stock : this.selectedProduct.stock;
        // In EDIT mode, we should account for the quantity already sold in the original sale
        const originalQty = this.originalSale?.quantity || 0;
        this.stockRestante = Math.max(0, (currentStock + originalQty) - qty);
    } else {
        this.stockRestante = 0;
    }
  }

  saveSale() {
    if (this.originalSale?.sourceType === 'APPOINTMENT') {
       this.notification.warning('No se pueden modificar las ventas generadas automáticamente desde citas.');
       return;
    }
    
    if (!this.sale.clientId) { this.notification.warning('Debe seleccionar un cliente.'); return; }
    if (this.sale.itemType === 'SERVICE' && !this.sale.serviceId) { this.notification.warning('Debe seleccionar un servicio.'); return; }
    if (this.sale.itemType === 'PRODUCT' && !this.sale.inventoryProductId) { this.notification.warning('Debe seleccionar un producto del inventario.'); return; }
    if (this.sale.quantity <= 0) { this.notification.warning('La cantidad debe ser mayor a 0.'); return; }

    const payload: any = { ...this.sale };
    
    // Convert numbers explicitly
    payload.clientId = Number(payload.clientId);
    payload.quantity = Number(payload.quantity);
    if (payload.unitPrice) payload.unitPrice = Number(payload.unitPrice);

    if (payload.itemType === 'SERVICE') {
        payload.serviceId = Number(payload.serviceId);
        delete payload.inventoryProductId;
        delete payload.inventoryProductVariantId;
    } else {
        payload.inventoryProductId = Number(payload.inventoryProductId);
        if (this.selectedProduct?.hasVariants) {
          payload.inventoryProductVariantId = Number(payload.inventoryProductVariantId);
        } else {
          // Explicitly null or omit for simple products
          payload.inventoryProductVariantId = null;
        }
        delete payload.serviceId;
    }

    payload.saleTime = '00:00:00';
    this.isSubmitting = true;
    this.saleApi.updateSale(this.saleId, payload).subscribe({
      next: () => {
        this.productsStore.refresh().subscribe();
        this.notification.success('Venta actualizada correctamente.', '¡Éxito!');
        this.router.navigate(['/ventas']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(err);
      }
    });
  }

  async deleteSale() {
    if (this.originalSale?.sourceType === 'APPOINTMENT') {
       this.notification.warning('No se pueden eliminar las ventas vinculadas a una cita. Cancele la cita para anular la venta.');
       return;
     }

    const confirmed = await this.confirm.ask('¿Está seguro de eliminar permanentemente esta venta manual?', {
      title: 'Eliminar venta',
      confirmText: 'Eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

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
