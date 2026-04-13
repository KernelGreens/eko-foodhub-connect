import type { Product } from "../../types";

export const mockProducts: Product[] = [
  {
    id: "1",
    vendorId: "1",
    name: "Fresh Tomatoes",
    category: "vegetables",
    description:
      "Premium quality Roma tomatoes, freshly harvested from our organic farm in Ogun State.",
    images: [
      "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg",
    ],
    price: 800,
    unit: "kg",
    stock: 500,
    minOrder: 5,
    maxOrder: 100,
    bulkPricing: [
      { minQuantity: 20, price: 750, discount: 6.25 },
      { minQuantity: 50, price: 700, discount: 12.5 },
    ],
    freshness: "very-fresh",
    harvestDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isOrganic: true,
    isAvailable: true,
    tags: ["organic", "local", "fresh"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    vendorId: "1",
    name: "Sweet Plantains",
    category: "fruits",
    description:
      "Ripe, sweet plantains perfect for frying or boiling. Sourced from local farms.",
    images: [
      "https://images.pexels.com/photos/5966630/pexels-photo-5966630.jpeg",
    ],
    price: 300,
    unit: "piece",
    stock: 200,
    minOrder: 10,
    bulkPricing: [{ minQuantity: 50, price: 280, discount: 6.67 }],
    freshness: "fresh",
    isOrganic: false,
    isAvailable: true,
    tags: ["sweet", "ripe", "local"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    vendorId: "1",
    name: "White Rice (Local)",
    category: "grains",
    description:
      "Premium quality local white rice, stone-free and well processed.",
    images: [
      "https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg",
    ],
    price: 1200,
    unit: "kg",
    stock: 1000,
    minOrder: 25,
    bulkPricing: [
      { minQuantity: 50, price: 1150, discount: 4.17 },
      { minQuantity: 100, price: 1100, discount: 8.33 },
    ],
    freshness: "fresh",
    isOrganic: false,
    isAvailable: true,
    tags: ["local", "stone-free", "quality"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
