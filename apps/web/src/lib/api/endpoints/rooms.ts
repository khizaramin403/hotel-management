import {
  imageSchema,
  nonNegativeIntSchema,
  paginatedResponseSchema,
  roomDetailSchema,
  roomSchema,
  successResponseSchema,
  type AvailabilityQuery,
  type CreateRoomInput,
  type Image,
  type PaginationMeta,
  type Room,
  type RoomDetail,
  type RoomsQuery,
  type SaveImageInput,
  type UpdateRoomImageInput,
  type UpdateRoomInput,
  type UploadUrlInput,
} from "@hotel/shared";
import { z } from "zod";
import { apiClient } from "../client";
import { parseApiResponse } from "../parseResponse";

const roomsListEnvelopeSchema = paginatedResponseSchema(roomSchema);
const roomDetailEnvelopeSchema = successResponseSchema(roomDetailSchema);
const roomAvailabilitySchema = z.object({
  available: z.boolean(),
  nights: nonNegativeIntSchema,
  subtotal: nonNegativeIntSchema,
  taxAmount: nonNegativeIntSchema,
  totalPrice: nonNegativeIntSchema,
});
const roomAvailabilityEnvelopeSchema = successResponseSchema(roomAvailabilitySchema);
const uploadUrlResponseSchema = z.object({
  uploadUrl: z.string().min(1),
  key: z.string().min(1),
});
const uploadUrlEnvelopeSchema = successResponseSchema(uploadUrlResponseSchema);
const imageEnvelopeSchema = successResponseSchema(imageSchema);

export type RoomAvailability = z.infer<typeof roomAvailabilitySchema>;
export type RoomImageUploadUrl = z.infer<typeof uploadUrlResponseSchema>;

export interface RoomsListResult {
  data: Room[];
  meta: PaginationMeta;
}

export async function listRooms(params?: Partial<RoomsQuery>): Promise<RoomsListResult> {
  const response = await apiClient.get("/rooms", { params });
  const parsed = parseApiResponse(roomsListEnvelopeSchema, response.data, "GET /rooms");
  return { data: parsed.data, meta: parsed.meta };
}

export async function getRoom(id: number): Promise<RoomDetail> {
  const response = await apiClient.get(`/rooms/${id}`);
  const parsed = parseApiResponse(roomDetailEnvelopeSchema, response.data, `GET /rooms/${id}`);
  return parsed.data;
}

export async function checkRoomAvailability(
  id: number,
  params: AvailabilityQuery,
): Promise<RoomAvailability> {
  const response = await apiClient.get(`/rooms/${id}/availability`, { params });
  const parsed = parseApiResponse(
    roomAvailabilityEnvelopeSchema,
    response.data,
    `GET /rooms/${id}/availability`,
  );
  return parsed.data;
}

export async function createRoom(input: CreateRoomInput): Promise<RoomDetail> {
  const response = await apiClient.post("/rooms", input);
  const parsed = parseApiResponse(roomDetailEnvelopeSchema, response.data, "POST /rooms");
  return parsed.data;
}

export async function updateRoom(id: number, input: UpdateRoomInput): Promise<RoomDetail> {
  const response = await apiClient.patch(`/rooms/${id}`, input);
  const parsed = parseApiResponse(roomDetailEnvelopeSchema, response.data, `PATCH /rooms/${id}`);
  return parsed.data;
}

export async function deactivateRoom(id: number): Promise<void> {
  await apiClient.delete(`/rooms/${id}`);
}

export async function createRoomImageUploadUrl(
  id: number,
  input: UploadUrlInput,
): Promise<RoomImageUploadUrl> {
  const response = await apiClient.post(`/rooms/${id}/images/upload-url`, input);
  const parsed = parseApiResponse(
    uploadUrlEnvelopeSchema,
    response.data,
    `POST /rooms/${id}/images/upload-url`,
  );
  return parsed.data;
}

export async function saveRoomImage(id: number, input: SaveImageInput): Promise<Image> {
  const response = await apiClient.post(`/rooms/${id}/images`, input);
  const parsed = parseApiResponse(imageEnvelopeSchema, response.data, `POST /rooms/${id}/images`);
  return parsed.data;
}

export async function setRoomImageCover(
  id: number,
  imageId: number,
  input: UpdateRoomImageInput = { isCover: true },
): Promise<Image> {
  const response = await apiClient.patch(`/rooms/${id}/images/${imageId}`, input);
  const parsed = parseApiResponse(
    imageEnvelopeSchema,
    response.data,
    `PATCH /rooms/${id}/images/${imageId}`,
  );
  return parsed.data;
}

export async function deleteRoomImage(id: number, imageId: number): Promise<void> {
  await apiClient.delete(`/rooms/${id}/images/${imageId}`);
}
