export type Promo = {
  promoId: number;
  selected: boolean;
  beginDate: string | null;
  endDate: string | null;
  description: string | null;
  rewardText: string | null;
  rewardValue: number | null;
  limitText: string | null;
  warningText: string | null;
  addressListText: string | null;
  image: string | null;
};

export type PromoCode = {
  id: string;
  code: string;
  title: string | null;
  active: boolean;
};
