import {
  Component,
  ChangeDetectionStrategy,
  computed,
  model,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { InventoryVariant, VariantAttribute } from '../../../../core/models/product.model';

@Component({
  selector: 'app-variant-config',
  imports: [FormsModule],
  templateUrl: './variant-config.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantConfigComponent {
  readonly variants = model<InventoryVariant[]>([]);

  readonly PRESET_ATTRS = ['Tamaño', 'Medida', 'Material', 'Fragancia', 'Volumen'];

  readonly attributes = signal<VariantAttribute[]>([]);
  newAttrName = '';
  valueInputs: Record<string, string> = {};

  readonly variantsGenerated = signal(false);

  readonly combinationCount = computed(() => {
    const attributes = this.attributes();

    if (attributes.length === 0) return 0;
    const hasValues = attributes.every((attribute) => attribute.values.length > 0);
    if (!hasValues) return 0;
    return attributes.reduce((acc, attribute) => acc * attribute.values.length, 1);
  });

  addPreset(name: string) {
    if (this.attributes().some((attribute) => attribute.name === name)) return;

    this.attributes.update((attributes) => [...attributes, { name, values: [] }]);
    this.valueInputs[name] = '';
  }

  addCustomAttr() {
    const name = this.newAttrName.trim();
    if (!name) return;

    if (!this.attributes().some((attribute) => attribute.name === name)) {
      this.attributes.update((attributes) => [...attributes, { name, values: [] }]);
      this.valueInputs[name] = '';
    }

    this.newAttrName = '';
  }

  removeAttr(attr: VariantAttribute) {
    this.attributes.update((attributes) => attributes.filter((attribute) => attribute.name !== attr.name));
    this.resetGeneratedVariants();
  }

  addValue(attr: VariantAttribute) {
    const val = (this.valueInputs[attr.name] ?? '').trim();
    if (!val || attr.values.includes(val)) return;

    this.attributes.update((attributes) =>
      attributes.map((attribute) =>
        attribute.name === attr.name
          ? { ...attribute, values: [...attribute.values, val] }
          : attribute,
      ),
    );
    this.valueInputs[attr.name] = '';
    this.resetGeneratedVariants();
  }

  removeValue(attr: VariantAttribute, val: string) {
    this.attributes.update((attributes) =>
      attributes.map((attribute) =>
        attribute.name === attr.name
          ? { ...attribute, values: attribute.values.filter((value) => value !== val) }
          : attribute,
      ),
    );
    this.resetGeneratedVariants();
  }

  generateVariants() {
    const variants = this.cartesian(this.attributes().map((attribute) => attribute.values)).map((combo) => ({
      variantLabel: combo.join(' / '),
      sku: '',
      stock: 0,
      minimumStock: 5,
      purchasePrice: 0,
      active: true
    }));

    this.variants.set(variants);
    this.variantsGenerated.set(true);
  }

  onVariantChange() {
    this.variants.update((variants) => [...variants]);
  }

  private resetGeneratedVariants() {
    this.variantsGenerated.set(false);
    this.variants.set([]);
  }

  private cartesian(arrays: string[][]): string[][] {
    if (arrays.length === 0) return [];
    return arrays.reduce<string[][]>(
      (acc, curr) => acc.flatMap(prev => curr.map(val => [...prev, val])),
      [[]]
    );
  }
}
