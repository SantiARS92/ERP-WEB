import { Page } from './page.model';

export interface ReportMonthlyEvolution {
  period: string;
  year: number;
  month: number;
  income: number;
  expenses: number;
  confirmedAppointments: number;
}

export interface ReportTopService {
  position: number | null;
  id: number;
  name: string;
  categoryName: string;
  totalCount: number;
  generatedIncome: number;
  averageDurationMinutes: number;
}

export interface ReportBusiestDay {
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  confirmedAppointments: number;
  percentage: number;
}

export interface MonthlySimpleReport {
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  totalConfirmedAppointments: number;
  incomeChangePercentage: number | null;
  expenseChangePercentage: number | null;
  confirmedAppointmentsChangePercentage: number | null;
  lastThreeMonths: ReportMonthlyEvolution[];
  topServices: ReportTopService[];
  busiestDays: ReportBusiestDay[];
}

export interface MonthlyDetailedReport {
  year: number;
  month: number;
  grossIncome: number;
  grossExpenses: number;
  operatingProfit: number;
  estimatedIncomeBase: number;
  estimatedExpenseBase: number;
  estimatedOutputVat: number;
  estimatedInputVat: number;
  estimatedVatPayable: number;
  estimatedIrpfPayable: number;
  estimatedTotalTaxes: number;
  profitabilityRatio: number;
}

export interface ReportMonthlyBreakdown {
  year: number;
  month: number;
  monthLabel: string;
  grossIncome: number;
  grossExpenses: number;
  operatingProfit: number;
  estimatedVatPayable: number;
  estimatedIrpfPayable?: number;
}

export interface ReportProfitEvolution {
  year: number;
  month: number;
  monthLabel: string;
  operatingProfit: number;
}

export interface QuarterlyDetailedReport {
  year: number;
  quarter: number;
  quarterLabel: string;
  grossIncome: number;
  grossExpenses: number;
  operatingProfit: number;
  estimatedIncomeBase: number;
  estimatedExpenseBase: number;
  estimatedOutputVat: number;
  estimatedInputVat: number;
  estimatedVatPayable: number;
  estimatedIrpfPayable: number;
  estimatedTotalTaxes: number;
  profitabilityRatio: number;
  operatingProfitChangePercentage: number | null;
  monthlyBreakdown: ReportMonthlyBreakdown[];
  profitEvolution: ReportProfitEvolution[];
}

export interface AnnualConsolidatedReport {
  year: number;
  grossIncome: number;
  grossExpenses: number;
  operatingProfit: number;
  estimatedIncomeBase: number;
  estimatedExpenseBase: number;
  estimatedOutputVat: number;
  estimatedInputVat: number;
  estimatedVatPayable: number;
  estimatedIrpfPayable: number;
  estimatedTotalTaxes: number;
  profitabilityRatio: number;
  operatingProfitChangePercentage: number | null;
  monthlyBreakdown: ReportMonthlyBreakdown[];
  profitEvolution: ReportProfitEvolution[];
}

export interface RankingResponse extends Page<ReportTopService> {
  type: 'SERVICE' | 'PRODUCT';
  year: number;
  month: number;
}
