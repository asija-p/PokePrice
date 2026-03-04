export interface Card {
  card_name: string;
  price: number;
  source: string; // Add this line
  hp?: number;
  level?: number;
  image?: string;
}
