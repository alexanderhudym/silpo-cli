export type NpSettlement = {
  id: string;
  title: string;
  area: string | null;
  region: string | null;
};

export type NpOffice = {
  id: string;
  title: string;
  address: string;
  type: string;
  number: number;
  status: string;
  latitude: number;
  longitude: number;
};
