export interface BudgetRecord {
  type: 'income' | 'expense';
  id: number;
  title: string;
  date: {
    from: Date;
    to?: Date;
  };
  amount: number;
  completed: boolean;
}

const reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;

export function parseRecordsFromJson(json: string): BudgetRecord[] {
  return JSON.parse(json, (key, value) => {
    if ((key === 'from' || key === 'to') && reISO.test(value)) {
      return new Date(value);
    }

    return value;
  });
}
