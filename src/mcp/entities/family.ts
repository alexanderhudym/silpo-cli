export type FamilyMember = {
  profileId: string;
  name: string | null;
  phone: string;
  image: string | null;
  profileCreatedAt: string;
  itsMe: boolean;
};

export type Child = {
  id: string;
  name: string | null;
  slug: string;
  dateOfBirth: string | null;
};

export type Pet = {
  id: string;
  name: string | null;
  slug: string;
};

export type Family = {
  name: string | null;
  members: FamilyMember[];
  children: Child[];
  pets: Pet[];
};
