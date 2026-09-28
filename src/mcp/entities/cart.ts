export type CartTimeslot = {
  start: string;
  end: string;
};

// Documentation-sourced: the server declares the cart address only as an
// unconstrained object, so this shape comes from the recorded response
// contract and cannot be checked against the schema snapshot. Coordinates are
// strings here, and addressType is spelled unlike the deliveryType values.
export type CartAddress = {
  addressType: string;
  latitude: string;
  longitude: string;
  courrierComment: string | null;
  phone: string | null;
  country: string | null;
  postCode: string | null;
  region: string | null;
  district: string | null;
  city: string;
  street: string;
  house: string;
  locality: string;
  polygonId: string | null;
  officeId: string | null;
};

export type CartProduct = {
  productId: string;
  companyId: string;
  branchId: string;
  slug: string;
  name: string;
  image: string;
  ratio: string;
  quantity: number;
  price: number;
  oldPrice: number | null;
  subTotal: number;
  subDiscount: number;
  total: number;
  stock: number;
  weighted: boolean;
  addToBasketStep: number;
  comment: string | null;
};

export type CartShipment = {
  id: string;
  companyId: string;
  branchId: string;
  products: CartProduct[];
};

export type CartCertificate = {
  barcode: string;
  pincode: string | null;
  faceValue: number | null;
};

export type CartDeliveryCalculation = {
  total: number;
  totalWeight: number;
  deliveryExpressByPromise: unknown;
};

export type CartPaymentCalculation = {
  availableTypes: string[];
};

export type CartValidation = {
  level: string;
  type: string;
  message: string;
  context: unknown[] | Record<string, unknown>;
};

export type CartCalculation = {
  total: number;
  totalAfterDiscounts: number;
  certificatesTotal: number;
  subTotal: number;
  subDiscount: number;
  productsTotal: number;
  delivery: CartDeliveryCalculation;
  promoCode: string | null;
  payment: CartPaymentCalculation;
  validations: CartValidation[];
};

// Documentation-sourced: the server describes this payload only as "full
// shopping cart object from API" with no properties, so this shape comes from
// the recorded response contract and cannot be checked against the schema
// snapshot.
export type Cart = {
  id: string;
  deliveryType: string;
  timeslot: CartTimeslot;
  address: CartAddress;
  shipments: CartShipment[];
  feedbackContacts: string;
  feedbackChanges: string;
  promoCode: string | null;
  packageType: string;
  paymentType: string;
  certificates: CartCertificate[];
  isAdultConfirmed: boolean;
  calculation: CartCalculation;
};

export type CartLoyalty = {
  bonusAvailable: number;
  bonusTotal: number;
  bonusRequested: number | null;
  isEnabled: boolean;
};

