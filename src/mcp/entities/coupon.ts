export type Coupon = {
  id: number;
  active: boolean;
  useWay: string | null;
  beginDate: string | null;
  endDate: string | null;
  description: string | null;
  limitText: string | null;
  warningText: string | null;
  image: string | null;
};

export type CouponDetails = {
  id: number;
  active: boolean;
  state: string | null;
  useWay: string | null;
  beginDate: string | null;
  endDate: string | null;
  usedCount: number;
  description: string | null;
  limitText: string | null;
  warningText: string | null;
  rewardText: string | null;
  rewardValue: number | null;
  image: string | null;
};
