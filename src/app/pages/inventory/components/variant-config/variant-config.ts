import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryVariant, VariantAttribute } from '../../../../core/models/product.model';

@Component({
  selector: 'app-variant-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './variant-config.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantConfigComponent {
  @Input() variants: InventoryVariant[] = [];
  @Output() variantsChange = new EventEmitter<InventoryVariant[]>();

  readonly PRESET_ATTRS = ['Tamaño', 'Medida', 'Material', 'Fragancia', 'Volumen'];

  attributes: VariantAttribute[] = [];
  newAttrName = '';
  valueInputs: Record<string, string> = {};

  generatedVariants: InventoryVariant[] = [];
  variantsGenerated = false;

  get combinationCount(): number {
    if (this.attributes.length === 0) return 0;
    const hasValues = this.attributes.every(a => a.values.length > 0);
    if (!hasValues) return 0;
    return this.attributes.reduce((acc, a) => acc * a.values.length, 1);
  }

  addPreset(name: string) {
    if (!this.attributes.find(a => a.name === name)) {
      this.attributes.push({ name, values: [] });
      this.valueInputs[name] = '';
    }
  }

  addCustomAttr() {
    const name = this.newAttrName.trim();
    if (!name) return;
    if (!this.attributes.find(a => a.name === name)) {
      this.attributes.push({ name, values: [] });
      this.valueInputs[name] = '';
    }
    this.newAttrName = '';
  }

  removeAttr(attr: VariantAttribute) {
    this.attributes = this.attributes.filter(a => a !== attr);
    this.variantsGenerated = false;
    this.generatedVariants = [];
    this.variantsChange.emit([]);
  }

  addValue(attr: VariantAttribute) {
    const val = (this.valueInputs[attr.name] ?? '').trim();
    if (!val || attr.values.includes(val)) return;
    attr.values = [...attr.values, val];
    this.valueInputs[attr.name] = '';
    this.variantsGenerated = false;
    this.generatedVariants = [];
    this.variantsChange.emit([]);
  }

  removeValue(attr: VariantAttribute, val: string) {
    attr.values = attr.values.filter(v => v !== val);
    this.variantsGenerated = false;
    this.generatedVariants = [];
    this.variantsChange.emit([]);
  }

  generateVariants() {
    const combos = this.cartesian(this.attributes.map(a => a.values));
    this.generatedVariants = combos.map((combo, i) => ({
      variantLabel: combo.join(' / '),
      sku: `SKU-${String(i + 1).padStart(3, '0')}`,
      stock: 0,
      minimumStock: 5,
      purchasePrice: 0,
      active: true
    }));
    this.variantsGenerated = true;
    this.variantsChange.emit(this.generatedVariants);
  }

  onVariantChange() {
    this.variantsChange.emit(this.generatedVariants);
  }

  private cartesian(arrays: string[][]): string[][] {
    if (arrays.length === 0) return [];
    return arrays.reduce<string[][]>(
      (acc, curr) => acc.flatMap(prev => curr.map(val => [...prev, val])),
      [[]]
    );
  }

  trackByIndex(_: number, i: number) { return i; }
  trackByName(_: number, a: VariantAttribute) { return a.name; }
  trackByVal(_: number, v: string) { return v; }
}
