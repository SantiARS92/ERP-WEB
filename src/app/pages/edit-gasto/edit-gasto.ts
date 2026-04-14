import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ExpenseApiService } from '../../core/services/expense-api.service';
import { ExpenseRequest, ExpenseResponse, ExpenseCategory } from '../../core/models/expense.model';

@Component({
  selector: 'app-edit-gasto',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-gasto.html',
  styles: ``,
})
export class EditGasto implements OnInit {
  expense: ExpenseRequest = {
    concept: '',
    category: 'SUPPLIES',
    amount: 0,
    quantity: 1,
    expenseDate: new Date().toISOString().split('T')[0],
    notes: ''
  };
  
  conceptSuggestions: string[] = [];
  conceptSelectedFromSuggestions = true; // assume true initially for existing expenses

  originalExpense: ExpenseResponse | undefined;
  expenseId!: number;
  isSubmitting = false;
  isLoading = true;

  private expenseApi = inject(ExpenseApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  readonly categories: { value: ExpenseCategory; label: string }[] = [
    { value: 'SUPPLIES', label: 'Suministros' },
    { value: 'SERVICES', label: 'Servicios'   },
    { value: 'OTHER',    label: 'Otros'        },
  ];

  ngOnInit() {
    // Fallback: If after 8 seconds we are still loading, redirect data to prevent "infinite" feeling
    setTimeout(() => {
      if (this.isLoading) {
        console.warn('EditGasto: Timeout de carga excedido (8s). Redirigiendo...');
        this.isLoading = false;
        this.router.navigate(['/gastos']);
        this.cdr.detectChanges();
      }
    }, 8000);

    // Get ID from paramMap instead of snapshot to be safer
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      this.expenseId = Number(idStr);
      
      console.log('EditGasto: Cargando ID', this.expenseId);

      if (idStr && !isNaN(this.expenseId)) {
        this.expenseApi.getExpenseById(this.expenseId).subscribe({
          next: (data) => {
            console.log('EditGasto: Datos recibidos', data);
            if (!data) {
              console.error('EditGasto: No hay datos para el ID', this.expenseId);
              this.router.navigate(['/gastos']);
              return;
            }
            this.originalExpense = data;
            this.expense = {
              concept:     data.concept || '',
              category:    data.category || 'SUPPLIES',
              amount:      data.amount || 0,
              quantity:    data.quantity || 1,
              expenseDate: data.expenseDate || new Date().toISOString().split('T')[0],
              notes:       data.notes ?? ''
            };
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('EditGasto: Error cargando el gasto', err);
            this.isLoading = false; // Stop loading even on error before redirect
            this.cdr.detectChanges();
            
            if (err.status === 404) alert('Gasto no encontrado.');
            this.router.navigate(['/gastos']);
          }
        });
      } else {
        console.error('EditGasto: ID no válido o ausente', idStr);
        this.router.navigate(['/gastos']);
      }
    });
  }

  onConceptInput() {
    this.conceptSelectedFromSuggestions = false;
    const query = this.expense.concept;
    const category = this.expense.category;
    if (query && query.length >= 2) {
      this.expenseApi.getSuggestions(query, category).subscribe({
        next: (data) => {
          this.conceptSuggestions = data;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error fetching suggestions:', err)
      });
    } else {
      this.conceptSuggestions = [];
    }
  }

  selectSuggestion(val: string) {
    this.expense.concept = val;
    this.conceptSelectedFromSuggestions = true;
    this.conceptSuggestions = [];
    this.cdr.detectChanges();
  }

  saveExpense() {
    if (!this.expense.concept?.trim()) { alert('Debe introducir un concepto.');      return; }
    
    if (this.expense.category === 'SUPPLIES' && !this.conceptSelectedFromSuggestions) {
      alert('Para suministros, debe seleccionar un producto del inventario de las sugerencias.');
      return;
    }
    if (!this.expense.amount || this.expense.amount <= 0) { alert('El importe debe ser mayor a 0.'); return; }
    if (!this.expense.quantity || this.expense.quantity <= 0) { alert('La cantidad debe ser mayor a 0.'); return; }

    const payload: ExpenseRequest = {
      ...this.expense,
      amount:   Number(this.expense.amount),
      quantity: Number(this.expense.quantity),
    };

    this.isSubmitting = true;
    this.expenseApi.updateExpense(this.expenseId, payload).subscribe({
      next: () => this.router.navigate(['/gastos']),
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error updating expense:', err);
        const errorMsg = err.error?.message || (typeof err.error === 'string' ? err.error : JSON.stringify(err.error)) || 'Hubo un error al guardar los cambios.';
        alert(errorMsg);
        this.cdr.detectChanges();
      }
    });
  }

  deleteExpense() {
    if (confirm('¿Está seguro de eliminar permanentemente este gasto?')) {
      this.expenseApi.deleteExpense(this.expenseId).subscribe({
        next: () => this.router.navigate(['/gastos']),
        error: () => alert('Ocurrió un error al eliminar el gasto.')
      });
    }
  }
}
