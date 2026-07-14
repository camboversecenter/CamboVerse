/**
 * Virtual market catalogue for the digital-economy proof of concept
 * (DIGITAL_ECONOMY.md §9). A market is attached to a heritage site; tapping the
 * Shop icon teleports the visitor into its plaza of kiosks.
 *
 * IP-SAFE: these are ORIGINAL placeholder brands that only *represent* a
 * category (coffee / fried chicken / burgers). No real trademark is used —
 * real brands would join later via the official Partner Program.
 */
export interface Product {
  id: string;
  name: string;
  emoji: string;
  /** Price in US cents (display currency for the PoC). */
  price: number;
  desc: string;
}

export interface Kiosk {
  id: string;
  brand: string;
  emoji: string;
  tagline: string;
  /** Stall body colour + awning accent. */
  color: string;
  accent: string;
  /** Plaza position [x, z] and facing (radians about Y). */
  pos: [number, number];
  rot: number;
  products: Product[];
}

export interface Market {
  id: string;
  spotId: string;
  title: string;
  blurb: string;
  kiosks: Kiosk[];
}

export const MARKETS: Market[] = [
  {
    id: "angkor-market",
    spotId: "angkor-wat",
    title: "Angkor Market",
    blurb: "A virtual market by the causeway — order a coffee or a meal, delivered for real from a merchant in your country.",
    kiosks: [
      {
        id: "preah-brew",
        brand: "Preah Brew",
        emoji: "☕",
        tagline: "Global coffee, Khmer soul",
        color: "#1e6b4f",
        accent: "#0f4a35",
        pos: [-10, -5.5],
        rot: 1.07,
        products: [
          { id: "pb-latte", name: "Iced Latte", emoji: "🧋", price: 450, desc: "Espresso over ice with milk." },
          { id: "pb-capp", name: "Cappuccino", emoji: "☕", price: 420, desc: "Espresso with steamed foam." },
          { id: "pb-cold", name: "Cold Brew", emoji: "🥤", price: 480, desc: "Slow-steeped, smooth and strong." },
          { id: "pb-matcha", name: "Matcha Latte", emoji: "🍵", price: 520, desc: "Stone-ground green tea + milk." },
        ],
      },
      {
        id: "sngkae-coffee",
        brand: "Sngkae Coffee",
        emoji: "☕",
        tagline: "Cambodian café favourites",
        color: "#6b4423",
        accent: "#4a2e17",
        pos: [-4.5, -9.5],
        rot: 0.44,
        products: [
          { id: "sk-tuktuk", name: "Kaffe Tuk-Tuk", emoji: "🧋", price: 300, desc: "Khmer iced coffee with condensed milk." },
          { id: "sk-palm", name: "Palm Sugar Latte", emoji: "☕", price: 350, desc: "Sweetened with Kampong Speu palm sugar." },
          { id: "sk-black", name: "Black Coffee", emoji: "☕", price: 220, desc: "Dark-roast robusta, the local way." },
        ],
      },
      {
        id: "krong-chicken",
        brand: "Krong Chicken",
        emoji: "🍗",
        tagline: "Crispy fried chicken",
        color: "#c0392b",
        accent: "#8e2a20",
        pos: [4.5, -9.5],
        rot: -0.44,
        products: [
          { id: "kc-bucket", name: "Crispy Bucket (6)", emoji: "🍗", price: 990, desc: "Six pieces, house spice blend." },
          { id: "kc-sandwich", name: "Chicken Sandwich", emoji: "🥪", price: 550, desc: "Crispy fillet, pickles, sauce." },
          { id: "kc-wings", name: "Spicy Wings (5)", emoji: "🌶️", price: 620, desc: "Five wings with Kampot pepper heat." },
        ],
      },
      {
        id: "mekong-burger",
        brand: "Mekong Burger",
        emoji: "🍔",
        tagline: "Burgers & fries",
        color: "#e0a91b",
        accent: "#b5851a",
        pos: [10, -5.5],
        rot: -1.07,
        products: [
          { id: "mb-classic", name: "Classic Burger", emoji: "🍔", price: 540, desc: "Beef patty, lettuce, tomato." },
          { id: "mb-cheese", name: "Cheeseburger", emoji: "🧀", price: 590, desc: "With a slice of melted cheese." },
          { id: "mb-fries", name: "Fries", emoji: "🍟", price: 260, desc: "Crisp, golden, salted." },
          { id: "mb-combo", name: "Combo Meal", emoji: "🥤", price: 850, desc: "Burger + fries + a drink." },
        ],
      },
    ],
  },
];

MARKETS.push({
  id: "watphnom-market",
  spotId: "wat-phnom",
  title: "Phnom Penh Market",
  blurb: "A market by the hill showcasing Cambodian food and crafts — order for real, delivered from a merchant in your country.",
  kiosks: [
    {
      id: "num-pang",
      brand: "Num Pang Corner",
      emoji: "🥖",
      tagline: "Khmer sandwiches",
      color: "#b5623a",
      accent: "#8a4529",
      pos: [-10, -5.5],
      rot: 1.07,
      products: [
        { id: "np-pork", name: "Num Pang Sach", emoji: "🥖", price: 250, desc: "Baguette with grilled pork & pickles." },
        { id: "np-sardine", name: "Num Pang Sardine", emoji: "🐟", price: 200, desc: "Sardine, herbs and chilli." },
        { id: "np-milo", name: "Iced Milo", emoji: "🧋", price: 150, desc: "Cold chocolate malt drink." },
      ],
    },
    {
      id: "tuktuk-coffee",
      brand: "Tuk-Tuk Coffee",
      emoji: "☕",
      tagline: "Roadside brews",
      color: "#6b4423",
      accent: "#4a2e17",
      pos: [-4.5, -9.5],
      rot: 0.44,
      products: [
        { id: "tt-iced", name: "Iced Khmer Coffee", emoji: "🧋", price: 175, desc: "Dark roast, condensed milk, ice." },
        { id: "tt-palm", name: "Palm Sugar Latte", emoji: "☕", price: 225, desc: "Sweetened with Kampong Speu palm sugar." },
        { id: "tt-cane", name: "Sugarcane Juice", emoji: "🥤", price: 125, desc: "Fresh-pressed with a squeeze of lime." },
      ],
    },
    {
      id: "amok-house",
      brand: "Amok House",
      emoji: "🍲",
      tagline: "Khmer kitchen",
      color: "#3f7d4f",
      accent: "#2c5c39",
      pos: [4.5, -9.5],
      rot: -0.44,
      products: [
        { id: "am-amok", name: "Fish Amok", emoji: "🍛", price: 450, desc: "Steamed coconut fish curry — the national dish." },
        { id: "am-loklak", name: "Beef Lok Lak", emoji: "🥩", price: 500, desc: "Stir-fried beef with a lime-pepper dip." },
        { id: "am-kroeung", name: "Chicken Kroeung", emoji: "🍗", price: 450, desc: "Lemongrass curry paste, grilled." },
        { id: "am-rice", name: "Jasmine Rice", emoji: "🍚", price: 75, desc: "A bowl of fragrant rice." },
      ],
    },
    {
      id: "krama-crafts",
      brand: "Krama Crafts",
      emoji: "🧣",
      tagline: "Artisan souvenirs",
      color: "#c0392b",
      accent: "#8e2a20",
      pos: [10, -5.5],
      rot: -1.07,
      products: [
        { id: "kr-krama", name: "Krama Scarf", emoji: "🧣", price: 600, desc: "Hand-woven checked cotton scarf." },
        { id: "kr-silver", name: "Silver Charm", emoji: "🪙", price: 900, desc: "Artisan Khmer silver pendant." },
        { id: "kr-fan", name: "Palm-leaf Fan", emoji: "🪭", price: 300, desc: "Woven by hand from sugar-palm leaf." },
        { id: "kr-cards", name: "Postcard Set", emoji: "✉️", price: 250, desc: "Prints of Khmer heritage sites." },
      ],
    },
  ],
});

export const marketForSpot = (spotId: string): Market | undefined =>
  MARKETS.find((m) => m.spotId === spotId);

export const findProduct = (market: Market, productId: string): Product | undefined => {
  for (const k of market.kiosks) {
    const p = k.products.find((p) => p.id === productId);
    if (p) return p;
  }
  return undefined;
};
