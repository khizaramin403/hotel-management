import type { Image, Room, RoomDetail, RoomType } from "@hotel/shared";
import { buildImageUrl } from "@/lib/images";

interface SeedRoomSpec {
  number: string;
  type: RoomType;
  pricePerNight: number;
  capacity: number;
  facilities: string[];
  description: string;
}

const SEED_ROOM_SPECS: readonly SeedRoomSpec[] = [
  {
    number: "101",
    type: "Single",
    pricePerNight: 6000,
    capacity: 1,
    facilities: ["Wi-Fi", "Air conditioning", "TV", "Desk"],
    description:
      "Compact first-floor single room with a quiet courtyard window, writing desk, and private shower.",
  },
  {
    number: "102",
    type: "Single",
    pricePerNight: 7500,
    capacity: 1,
    facilities: ["Wi-Fi", "Air conditioning", "TV", "Coffee maker"],
    description:
      "Bright single room suited for solo stays, featuring a queen-width single bed and tea station.",
  },
  {
    number: "103",
    type: "Double",
    pricePerNight: 10000,
    capacity: 2,
    facilities: ["Wi-Fi", "Air conditioning", "TV", "Mini fridge"],
    description:
      "Comfortable double room with one queen bed, blackout curtains, and easy access to the lobby.",
  },
  {
    number: "104",
    type: "Double",
    pricePerNight: 11500,
    capacity: 2,
    facilities: ["Wi-Fi", "Air conditioning", "Breakfast", "TV"],
    description:
      "Garden-facing double room with breakfast included, soft linens, and a walk-in rain shower.",
  },
  {
    number: "201",
    type: "Deluxe",
    pricePerNight: 15000,
    capacity: 2,
    facilities: ["Wi-Fi", "Air conditioning", "Breakfast", "TV", "Balcony"],
    description:
      "Second-floor deluxe room with a private balcony, natural daylight, and breakfast for two.",
  },
  {
    number: "202",
    type: "Deluxe",
    pricePerNight: 16500,
    capacity: 2,
    facilities: ["Wi-Fi", "Air conditioning", "Breakfast", "TV", "Desk"],
    description:
      "Spacious deluxe room with a calm neutral interior, dedicated workspace, and king-size bed.",
  },
  {
    number: "203",
    type: "Deluxe",
    pricePerNight: 17500,
    capacity: 3,
    facilities: ["Wi-Fi", "Air conditioning", "Breakfast", "TV", "Seating area"],
    description:
      "Corner deluxe room offering extra floor space, a reading armchair, and courtyard views.",
  },
  {
    number: "204",
    type: "Deluxe",
    pricePerNight: 18500,
    capacity: 3,
    facilities: ["Wi-Fi", "Air conditioning", "Breakfast", "TV", "Balcony"],
    description:
      "Top-tier deluxe room with twin or king bedding, shaded terrace seating, and evening turndown.",
  },
  {
    number: "301",
    type: "Suite",
    pricePerNight: 26000,
    capacity: 3,
    facilities: ["Wi-Fi", "Air conditioning", "Breakfast", "TV", "Living room", "Bathtub"],
    description:
      "Third-floor suite featuring a separate lounge, soaking bathtub, and quiet views above the trees.",
  },
  {
    number: "302",
    type: "Suite",
    pricePerNight: 30000,
    capacity: 4,
    facilities: [
      "Wi-Fi",
      "Air conditioning",
      "Breakfast",
      "TV",
      "Living room",
      "Bathtub",
      "Balcony",
    ],
    description:
      "Flagship corner suite with a full sitting room, dining table, balcony, and deep soaking tub.",
  },
  {
    number: "210",
    type: "Family",
    pricePerNight: 20000,
    capacity: 4,
    facilities: ["Wi-Fi", "Air conditioning", "Breakfast", "TV", "Mini fridge"],
    description:
      "Practical family room with one double bed, two twin beds, and space for luggage and strollers.",
  },
  {
    number: "211",
    type: "Family",
    pricePerNight: 24000,
    capacity: 6,
    facilities: ["Wi-Fi", "Air conditioning", "Breakfast", "TV", "Kitchenette", "Dining area"],
    description:
      "Large two-bay family room with interconnecting sleeping zones, dining nook, and kitchenette.",
  },
];

export function buildRoomImageUrls(key: string): Image["urls"] {
  const url = buildImageUrl(key) ?? `/images/${key}`;
  return {
    sm: url,
    md: url,
    lg: url,
  };
}

export function createSeedRooms(): RoomDetail[] {
  let imageId = 1;

  return SEED_ROOM_SPECS.map((spec, index) => {
    const roomId = index + 1;
    const nn = String(roomId).padStart(2, "0");

    const images: Image[] = [1, 2, 3].map((slot) => {
      const key = `rooms/room-${nn}-${slot}.webp`;
      const image: Image = {
        id: imageId,
        key,
        isCover: slot === 1,
        sortOrder: slot - 1,
        urls: buildRoomImageUrls(key),
      };
      imageId += 1;
      return image;
    });

    return {
      id: roomId,
      number: spec.number,
      type: spec.type,
      pricePerNight: spec.pricePerNight,
      capacity: spec.capacity,
      facilities: [...spec.facilities],
      description: spec.description,
      isActive: true,
      coverImage: images[0] ?? null,
      images,
    };
  });
}

export function toRoomSummary(room: RoomDetail): Room {
  return {
    id: room.id,
    number: room.number,
    type: room.type,
    pricePerNight: room.pricePerNight,
    capacity: room.capacity,
    facilities: [...room.facilities],
    description: room.description,
    isActive: room.isActive,
    coverImage: room.coverImage ? { ...room.coverImage, urls: { ...room.coverImage.urls } } : null,
  };
}

export function cloneRoomDetail(room: RoomDetail): RoomDetail {
  const images = room.images.map((img) => ({
    ...img,
    urls: { ...img.urls },
  }));
  const coverImage = images.find((img) => img.isCover) ?? images[0] ?? null;

  return {
    ...toRoomSummary(room),
    coverImage,
    images,
  };
}
