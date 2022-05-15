export type TimestampInMsec = number & { type: 'timestamp-in-msec' };

export interface BudgetRecord {
  type: 'income' | 'expense';
  id: number;
  title: string;
  date: {
    from: TimestampInMsec;
    to: TimestampInMsec;
  };
  amount: number;
  completed: boolean;
}
