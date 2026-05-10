import type { Prisma } from "../generated/prisma/client";
import { getInventoryStatuses } from "./stock";

type InventoryReservationForRelease = {
  id: string;
  inventoryRecordId: string;
  quantity: number;
};

function groupReservationsByInventoryRecord(
  reservations: InventoryReservationForRelease[],
) {
  const grouped = new Map<string, { quantity: number; reservationIds: string[] }>();

  reservations.forEach((reservation) => {
    const current = grouped.get(reservation.inventoryRecordId) ?? {
      quantity: 0,
      reservationIds: [],
    };

    current.quantity += reservation.quantity;
    current.reservationIds.push(reservation.id);
    grouped.set(reservation.inventoryRecordId, current);
  });

  return grouped;
}

export async function releaseOrderInventoryReservations(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const orderItems = await tx.orderItem.findMany({
    where: {
      fulfillmentGroup: {
        orderId,
      },
    },
    include: {
      inventoryReservations: true,
    },
  });
  const reservations = orderItems.flatMap((item) => item.inventoryReservations);
  const reservationsByInventoryRecord =
    groupReservationsByInventoryRecord(reservations);
  let releasedQuantity = 0;

  for (const [inventoryRecordId, release] of reservationsByInventoryRecord) {
    const inventoryRecord = await tx.inventoryRecord.update({
      where: {
        id: inventoryRecordId,
      },
      data: {
        availableQuantity: {
          increment: release.quantity,
        },
        reservedQuantity: {
          decrement: release.quantity,
        },
      },
    });
    const statuses = getInventoryStatuses(inventoryRecord.availableQuantity);

    await tx.inventoryRecord.update({
      where: {
        id: inventoryRecord.id,
      },
      data: {
        stockStatus: statuses.inventoryStatus,
      },
    });

    await tx.productListing.update({
      where: {
        id: inventoryRecord.productListingId,
      },
      data: {
        availabilityStatus: statuses.listingStatus,
      },
    });

    await tx.inventoryReservation.deleteMany({
      where: {
        id: {
          in: release.reservationIds,
        },
      },
    });

    releasedQuantity += release.quantity;
  }

  return {
    releasedQuantity,
    releasedReservationCount: reservations.length,
  };
}
