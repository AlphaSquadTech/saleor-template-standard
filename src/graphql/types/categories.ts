export type Category = {
  id: string;
  name: string;
  description: string;
  slug: string;
  backgroundImage: {
    url: string;
  } | null;
};
