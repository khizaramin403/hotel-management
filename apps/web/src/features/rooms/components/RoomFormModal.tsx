"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ERROR_CODE,
  ROOM_TYPES,
  type Room,
  type RoomDetail,
  type RoomType,
} from "@hotel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Input, InputNumber, Modal, Popconfirm, Select, Skeleton, Switch } from "antd";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { applyServerValidationDetails } from "@/components/auth/authFormErrors";
import { ErrorState } from "@/components/ui";
import { createRoom, normalizeApiError, updateRoom } from "@/lib/api";
import { useRoomQuery } from "../hooks/useRoomQuery";
import { upsertRoomInCache } from "../lib/roomCache";
import {
  buildCreateRoomPayload,
  buildUpdateRoomPayload,
  getRoomFormSchema,
  MAX_ROOM_CAPACITY,
  MIN_ROOM_CAPACITY,
  MIN_ROOM_PRICE_PKR,
  normalizeFacilitiesInput,
  ROOM_FACILITY_SUGGESTIONS,
  ROOM_FORM_FIELDS,
  type RoomFormFieldName,
  type RoomFormValues,
} from "../lib/roomFormSchema";

export type RoomFormModalMode = "create" | Room;

export interface RoomFormModalProps {
  mode: RoomFormModalMode;
  onClose: () => void;
}

const ROOM_TYPE_OPTIONS: { label: RoomType; value: RoomType }[] = ROOM_TYPES.map((type) => ({
  label: type,
  value: type,
}));

const FACILITY_OPTIONS: { label: string; value: string }[] = ROOM_FACILITY_SUGGESTIONS.map(
  (facility) => ({
    label: facility,
    value: facility,
  }),
);

const FIELD_ELEMENT_IDS: Record<RoomFormFieldName, string> = {
  number: "room-form-number",
  type: "room-form-type",
  pricePerNight: "room-form-price",
  capacity: "room-form-capacity",
  facilities: "room-form-facilities",
  description: "room-form-description",
  isActive: "room-form-active",
};

function createEmptyDefaults(): RoomFormValues {
  return {
    number: "",
    type: undefined,
    pricePerNight: null,
    capacity: null,
    facilities: [],
    description: "",
    isActive: true,
  };
}

function toEditFormValues(room: Room | RoomDetail): RoomFormValues {
  return {
    number: room.number,
    type: room.type,
    pricePerNight: room.pricePerNight,
    capacity: room.capacity,
    facilities: [...room.facilities],
    description: room.description,
    isActive: room.isActive,
  };
}

function formatPkrInputValue(value: number | string | undefined): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  const str = String(value);
  const [intPart, decPart] = str.split(".");
  const formattedInt = (intPart ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

function parsePkrInputValue(displayValue: string | undefined): string {
  return (displayValue ?? "").replace(/,/g, "").trim();
}

function normalizeInputNumberValue(nextValue: number | string | null): number | null {
  if (nextValue === null || nextValue === "") {
    return null;
  }
  const numeric = typeof nextValue === "number" ? nextValue : Number(nextValue);
  return Number.isNaN(numeric) ? null : numeric;
}

function scrollToFirstFieldError(errors: FieldErrors<RoomFormValues>): void {
  const firstInvalid = ROOM_FORM_FIELDS.find((fieldName) => Boolean(errors[fieldName]));
  if (!firstInvalid || typeof document === "undefined") {
    return;
  }

  const element = document.getElementById(FIELD_ELEMENT_IDS[firstInvalid]);
  if (!element) {
    return;
  }

  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  element.focus();
}

function FieldError({ id, message }: { id: string; message?: string }): ReactNode {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 mb-0 flex items-center gap-1.5 font-sans text-[13px] leading-[20px] text-error"
    >
      <ExclamationCircleOutlined className="shrink-0 text-[14px]" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function RoomFormModal({ mode, onClose }: RoomFormModalProps) {
  const isEditMode = mode !== "create";
  const editRoom = isEditMode ? mode : null;
  const editRoomId = editRoom?.id ?? 0;

  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const {
    data: roomDetail,
    isPending: isDetailPending,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useRoomQuery(editRoomId);

  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const hydratedRoomIdRef = useRef<number | null>(null);

  const {
    control,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(getRoomFormSchema(isEditMode ? "edit" : "create")),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: createEmptyDefaults(),
  });

  useEffect(() => {
    if (!isEditMode || !roomDetail) {
      return;
    }

    if (hydratedRoomIdRef.current !== roomDetail.id || !isDirty) {
      hydratedRoomIdRef.current = roomDetail.id;
      reset(toEditFormValues(roomDetail));
    }
  }, [isDirty, isEditMode, reset, roomDetail]);

  const isLoadingEditDetail = isEditMode && isDetailPending && !roomDetail;
  const isDetailLoadFailure = isEditMode && isDetailError && !roomDetail;
  const modalTitle = isEditMode
    ? `Edit room ${roomDetail?.number ?? editRoom?.number ?? ""}`
    : "Add room";

  const requestClose = () => {
    if (isSubmitting) {
      return;
    }
    if (isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  };

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false);
    onClose();
  };

  const handleValidSubmit = async (values: RoomFormValues) => {
    try {
      const saved = isEditMode
        ? await updateRoom(editRoomId, buildUpdateRoomPayload(values))
        : await createRoom(buildCreateRoomPayload(values));

      upsertRoomInCache(queryClient, saved, !isEditMode);
      message?.success?.({
        content: "Room saved",
        duration: 3,
      });
      setDiscardConfirmOpen(false);
      onClose();
    } catch (error: unknown) {
      const apiError = normalizeApiError(error);

      if (apiError.status === 409 || apiError.code === ERROR_CODE.ROOM_NUMBER_TAKEN) {
        const duplicateMessage =
          apiError.message || "A room with this number already exists.";
        setError("number", {
          type: "server",
          message: duplicateMessage,
        });
        const numberInput = document.getElementById(FIELD_ELEMENT_IDS.number);
        numberInput?.focus();
        return;
      }

      if (apiError.status === 422 && apiError.details && apiError.details.length > 0) {
        const applied = applyServerValidationDetails(apiError.details, ROOM_FORM_FIELDS, setError);
        if (applied) {
          return;
        }
      }

      message?.error?.({
        content:
          apiError.message || "Could not save the room. Check your connection and try again.",
        duration: 5,
      });
    }
  };

  const handleInvalidSubmit = (fieldErrors: FieldErrors<RoomFormValues>) => {
    scrollToFirstFieldError(fieldErrors);
  };

  return (
    <Modal
      open
      width={520}
      className="room-form-modal !max-w-[calc(100vw-32px)]"
      onCancel={requestClose}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
      footer={null}
      destroyOnHidden
      title={
        <span className="font-serif text-[22px] font-medium leading-[30px] text-ink">
          {modalTitle}
        </span>
      }
    >
      {isLoadingEditDetail ? (
        <div role="status" aria-busy="true" aria-label="Loading room details" className="py-2">
          <Skeleton active paragraph={{ rows: 7 }} />
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={requestClose} className="min-h-[44px] w-full sm:min-h-[40px] sm:w-auto">
              Cancel
            </Button>
          </div>
        </div>
      ) : isDetailLoadFailure ? (
        <div className="space-y-6 pt-2">
          <ErrorState
            variant="alert"
            title="Could not load room details"
            description="Check your connection and try again."
            onRetry={() => {
              void refetchDetail();
            }}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={requestClose} className="min-h-[44px] w-full sm:min-h-[40px] sm:w-auto">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(handleValidSubmit, handleInvalidSubmit)}
          noValidate
          className="space-y-4 pt-2"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor={FIELD_ELEMENT_IDS.number}
                className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
              >
                Room number
              </label>
              <Controller
                control={control}
                name="number"
                render={({ field }) => (
                  <Input
                    id={FIELD_ELEMENT_IDS.number}
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="205"
                    maxLength={20}
                    autoFocus={!isEditMode}
                    status={errors.number ? "error" : undefined}
                    aria-invalid={Boolean(errors.number)}
                    aria-describedby={errors.number ? "room-form-number-error" : undefined}
                    className="font-sans !text-[16px] md:!text-[14px]"
                  />
                )}
              />
              <FieldError id="room-form-number-error" message={errors.number?.message} />
            </div>

            <div>
              <label
                htmlFor={FIELD_ELEMENT_IDS.type}
                className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
              >
                Type
              </label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select<RoomType>
                    id={FIELD_ELEMENT_IDS.type}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Select room type"
                    options={ROOM_TYPE_OPTIONS}
                    status={errors.type ? "error" : undefined}
                    aria-invalid={Boolean(errors.type)}
                    aria-describedby={errors.type ? "room-form-type-error" : undefined}
                    className="w-full"
                  />
                )}
              />
              <FieldError id="room-form-type-error" message={errors.type?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor={FIELD_ELEMENT_IDS.pricePerNight}
                className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
              >
                Price per night
              </label>
              <Controller
                control={control}
                name="pricePerNight"
                render={({ field }) => (
                  <InputNumber<number | string>
                    id={FIELD_ELEMENT_IDS.pricePerNight}
                    name={field.name}
                    step={500}
                    prefix={<span className="font-sans text-[13px] text-muted">PKR</span>}
                    value={field.value ?? null}
                    formatter={formatPkrInputValue}
                    parser={parsePkrInputValue}
                    onChange={(nextValue) => field.onChange(normalizeInputNumberValue(nextValue))}
                    onBlur={field.onBlur}
                    placeholder="15,000"
                    status={errors.pricePerNight ? "error" : undefined}
                    aria-valuemin={MIN_ROOM_PRICE_PKR}
                    aria-invalid={Boolean(errors.pricePerNight)}
                    aria-describedby={errors.pricePerNight ? "room-form-price-error" : undefined}
                    className="!w-full font-sans tabular !text-[16px] md:!text-[14px]"
                  />
                )}
              />
              <FieldError id="room-form-price-error" message={errors.pricePerNight?.message} />
            </div>

            <div>
              <label
                htmlFor={FIELD_ELEMENT_IDS.capacity}
                className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
              >
                Capacity
              </label>
              <Controller
                control={control}
                name="capacity"
                render={({ field }) => (
                  <InputNumber<number | string>
                    id={FIELD_ELEMENT_IDS.capacity}
                    name={field.name}
                    value={field.value ?? null}
                    onChange={(nextValue) => field.onChange(normalizeInputNumberValue(nextValue))}
                    onBlur={field.onBlur}
                    placeholder="2"
                    status={errors.capacity ? "error" : undefined}
                    aria-valuemin={MIN_ROOM_CAPACITY}
                    aria-valuemax={MAX_ROOM_CAPACITY}
                    aria-invalid={Boolean(errors.capacity)}
                    aria-describedby={errors.capacity ? "room-form-capacity-error" : undefined}
                    className="!w-full font-sans tabular !text-[16px] md:!text-[14px]"
                  />
                )}
              />
              <FieldError id="room-form-capacity-error" message={errors.capacity?.message} />
            </div>
          </div>

          <div>
            <label
              htmlFor={FIELD_ELEMENT_IDS.facilities}
              className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
            >
              Facilities (optional)
            </label>
            <Controller
              control={control}
              name="facilities"
              render={({ field }) => (
                <Select<string[]>
                  id={FIELD_ELEMENT_IDS.facilities}
                  mode="tags"
                  allowClear
                  tokenSeparators={[","]}
                  value={field.value}
                  onChange={(nextValues) => {
                    field.onChange(normalizeFacilitiesInput(nextValues));
                  }}
                  onBlur={field.onBlur}
                  placeholder="Select or type facilities"
                  options={FACILITY_OPTIONS}
                  status={errors.facilities ? "error" : undefined}
                  aria-invalid={Boolean(errors.facilities)}
                  aria-describedby={errors.facilities ? "room-form-facilities-error" : undefined}
                  className="w-full"
                />
              )}
            />
            <FieldError id="room-form-facilities-error" message={errors.facilities?.message} />
          </div>

          <div>
            <label
              htmlFor={FIELD_ELEMENT_IDS.description}
              className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
            >
              Description
            </label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input.TextArea
                  id={FIELD_ELEMENT_IDS.description}
                  name={field.name}
                  ref={field.ref}
                  rows={4}
                  maxLength={2000}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Quiet room with courtyard view and workspace."
                  status={errors.description ? "error" : undefined}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={
                    errors.description ? "room-form-description-error" : undefined
                  }
                  className="min-h-[96px] !resize-y font-sans !text-[16px] md:!text-[14px]"
                />
              )}
            />
            <FieldError
              id="room-form-description-error"
              message={errors.description?.message}
            />
          </div>

          {isEditMode ? (
            <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-canvas px-4 py-3">
              <div>
                <label
                  htmlFor={FIELD_ELEMENT_IDS.isActive}
                  className="block font-sans text-[14px] font-medium leading-[20px] text-ink"
                >
                  Active
                </label>
                <p
                  id="room-form-active-help"
                  className="m-0 font-sans text-[13px] leading-[20px] text-muted"
                >
                  Active rooms appear in public search and accept bookings.
                </p>
              </div>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id={FIELD_ELEMENT_IDS.isActive}
                    checked={field.value}
                    onChange={field.onChange}
                    aria-describedby="room-form-active-help"
                  />
                )}
              />
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Popconfirm
              title="Discard changes?"
              description="Your unsaved changes will be lost."
              okText="Discard"
              cancelText="Keep"
              okButtonProps={{ danger: true }}
              open={discardConfirmOpen}
              onConfirm={handleConfirmDiscard}
              onCancel={() => setDiscardConfirmOpen(false)}
              onOpenChange={(nextOpen) => {
                setDiscardConfirmOpen(nextOpen && isDirty);
              }}
            >
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  if (!isDirty) {
                    onClose();
                  }
                }}
                className="min-h-[44px] w-full sm:min-h-[40px] sm:w-auto sm:min-w-[88px]"
              >
                Cancel
              </Button>
            </Popconfirm>

            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              className="min-h-[44px] w-full sm:min-h-[40px] sm:w-auto sm:min-w-[88px]"
            >
              Save
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
