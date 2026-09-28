export type PremiumFeatureBalance = {
  total: string;
  available: string;
  type: string | null;
};

export type PremiumFeature = {
  id: string;
  business: string;
  name: string;
  checkoutText: string;
  image: string;
  balance: PremiumFeatureBalance | null;
  webLink: string | null;
  mobileLink: string | null;
  descriptionHtml: string | null;
};

export type PremiumSubscription = {
  webLink?: string;
  mobileLink?: string;
  id?: string;
  profileId?: string;
  subscriptionId?: string;
  createdAt?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  features?: PremiumFeature[];
  bonusesObtainedAmount?: number;
  shareWebLink?: string;
  shareMobileLink?: string;
};
