export type CategoryListItem = {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
};

export type PopularCategory = {
  id: string;
  slug: string;
  title: string;
  url: string;
};

export type CategoryPathEntry = {
  id: string;
  slug: string;
  title: string;
};

export type CategoryPriceRange = {
  min: number;
  max: number;
};

export type CategoryChild = {
  id: string;
  slug: string;
  title: string;
};

// Documentation-sourced: the server declares each tree node as an
// unconstrained object, so this shape comes from the recorded response
// contract and cannot be checked against the schema snapshot.
export type CategoryTreeNode = {
  slug: string;
  children: CategoryTreeNode[];
  total?: number;
};

export type CategoryDetails = {
  id: string;
  slug: string;
  title: string;
  url: string;
  path: CategoryPathEntry[] | null;
  priceRange: CategoryPriceRange | null;
  children: CategoryChild[] | null;
  visible: boolean;
};
