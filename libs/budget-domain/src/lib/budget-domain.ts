export interface BudgetRecord {
  type: 'income' | 'expense';
  id: number;
  title: string;
  date: {
    from: number;
    to: number;
  };
  amount: number;
  completed: boolean;
}
