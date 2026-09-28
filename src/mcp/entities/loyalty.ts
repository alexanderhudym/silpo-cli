export type LoyaltyCard = {
  barcode: string;
  typeName: string;
  memberId: number;
};

export type LoyaltyAccount = {
  type: string;
  amount: number;
};

export type LoyaltyBalance = {
  total: number;
  currency: string;
  accounts: LoyaltyAccount[];
};

export type Loyalty = {
  card: LoyaltyCard | null;
  balance: LoyaltyBalance | null;
};
