export type Offer = {
  id: string;
  name: string;
  description: {
    time: number;
    blocks: string; // other possible type
    version: string;
  };
  endDate: string | null;
  startDate: string;
  type: "CATALOGUE" | "ORDER"; // other possible values if applicable
};