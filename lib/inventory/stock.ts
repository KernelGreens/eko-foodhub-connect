export function getInventoryStatuses(availableQuantity: number): {
  inventoryStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  listingStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
} {
  if (availableQuantity <= 0) {
    return {
      inventoryStatus: "OUT_OF_STOCK",
      listingStatus: "OUT_OF_STOCK",
    };
  }

  if (availableQuantity < 10) {
    return {
      inventoryStatus: "LOW_STOCK",
      listingStatus: "LOW_STOCK",
    };
  }

  return {
    inventoryStatus: "IN_STOCK",
    listingStatus: "IN_STOCK",
  };
}
