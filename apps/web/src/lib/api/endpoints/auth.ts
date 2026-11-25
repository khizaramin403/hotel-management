import {
  paginatedResponseSchema,
  successResponseSchema,
  userSchema,
  type CreateStaffInput,
  type LoginInput,
  type PaginationMeta,
  type RegisterInput,
  type StaffQuery,
  type User,
} from "@hotel/shared";
import { z } from "zod";
import { apiClient } from "../client";
import { parseApiResponse } from "../parseResponse";

const userEnvelopeSchema = successResponseSchema(z.object({ user: userSchema }));
const staffListEnvelopeSchema = paginatedResponseSchema(userSchema);

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export async function register(input: RegisterInput): Promise<User> {
  const response = await apiClient.post("/auth/register", input);
  const parsed = parseApiResponse(userEnvelopeSchema, response.data, "POST /auth/register");
  return parsed.data.user;
}

export async function login(input: LoginInput): Promise<User> {
  const response = await apiClient.post("/auth/login", input);
  const parsed = parseApiResponse(userEnvelopeSchema, response.data, "POST /auth/login");
  return parsed.data.user;
}

export async function refreshSession(): Promise<User> {
  const response = await apiClient.post("/auth/refresh");
  const parsed = parseApiResponse(userEnvelopeSchema, response.data, "POST /auth/refresh");
  return parsed.data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get("/auth/me");
  const parsed = parseApiResponse(userEnvelopeSchema, response.data, "GET /auth/me");
  return parsed.data.user;
}

export async function listStaff(params?: Partial<StaffQuery>): Promise<PaginatedResult<User>> {
  const response = await apiClient.get("/auth/staff", { params });
  const parsed = parseApiResponse(staffListEnvelopeSchema, response.data, "GET /auth/staff");
  return { data: parsed.data, meta: parsed.meta };
}

export async function createStaff(input: CreateStaffInput): Promise<User> {
  const response = await apiClient.post("/auth/staff", input);
  const parsed = parseApiResponse(userEnvelopeSchema, response.data, "POST /auth/staff");
  return parsed.data.user;
}

export async function deleteStaff(id: number): Promise<void> {
  await apiClient.delete(`/auth/staff/${id}`);
}
