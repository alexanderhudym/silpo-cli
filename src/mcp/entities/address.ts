export type FoundAddress = {
  address: string | null;
  city: string | null;
  street: string | null;
  houseNumber: string | null;
  district: string | null;
  latitude: number;
  longitude: number;
};

export type SavedAddress = {
  id: string;
  tag: string | null;
  city: string | null;
  street: string | null;
  building: string | null;
  apartment: string | null;
  floor: string | null;
  entrance: string | null;
  latitude: number | null;
  longitude: number | null;
  comment: string | null;
};
