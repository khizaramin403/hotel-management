"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb, Button, Skeleton, Tag } from "antd";
import { ErrorState } from "@/components/ui";
import { ApiClientError } from "@/lib/api";
import { plural } from "@/lib/format";
import { useRoomQuery } from "../hooks/useRoomQuery";
import { getFacilityIcon } from "../lib/facilityIcons";
import { BookingCard } from "./BookingCard";
import { RoomDescription } from "./RoomDescription";
import { RoomGallery } from "./RoomGallery";

export interface RoomDetailViewProps {
  roomId: number;
}

const THUMBNAIL_SLOTS = [1, 2, 3, 4] as const;

function RoomDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading room details"
      className="space-y-6"
    >
      <Skeleton.Input active size="small" className="!w-40" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-8">
          <div className="space-y-3">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-neutral-100">
              <Skeleton.Node
                active
                className="!block !h-full !w-full"
                style={{ width: "100%", height: "100%", borderRadius: 0 }}
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {THUMBNAIL_SLOTS.map((slot) => (
                <div
                  key={slot}
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-neutral-100"
                >
                  <Skeleton.Node
                    active
                    className="!block !h-full !w-full"
                    style={{ width: "100%", height: "100%", borderRadius: 0 }}
                  />
                </div>
              ))}
            </div>
          </div>

          <Skeleton active title={{ width: "45%" }} paragraph={{ rows: 4 }} />
        </div>

        <aside className="lg:col-span-4" aria-hidden="true" />
      </div>
    </div>
  );
}

export function RoomDetailView({ roomId }: RoomDetailViewProps) {
  const router = useRouter();
  const isValidId = Number.isInteger(roomId) && roomId > 0;
  const { data: room, isPending, isError, error, refetch } = useRoomQuery(roomId);

  const isNotFound =
    !isValidId ||
    (error instanceof ApiClientError && (error.code === "NOT_FOUND" || error.status === 404));

  return (
    <section className="mx-auto max-w-container px-4 pt-8 pb-24 lg:px-6 lg:pb-8">
      {!isValidId || (isError && isNotFound) ? (
        <ErrorState
          status="404"
          title="Room not found"
          description="The room you are looking for could not be found."
          action={
            <Button type="primary" onClick={() => router.push("/")}>
              Back to home
            </Button>
          }
        />
      ) : isPending ? (
        <RoomDetailSkeleton />
      ) : isError || !room ? (
        <ErrorState
          variant="alert"
          title="Could not load room details"
          description="Check your connection and try again."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : (
        <div className="space-y-6">
          <Breadcrumb
            items={[
              { title: <Link href="/">Rooms</Link> },
              { title: `Room ${room.number}` },
            ]}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <div className="space-y-6 lg:col-span-8">
              <RoomGallery
                key={`gallery-${room.id}`}
                images={room.images}
                coverImage={room.coverImage}
                roomTitle={`${room.type} · Room ${room.number}`}
              />

              <div>
                <h1 className="m-0 font-serif text-[28px] font-semibold leading-[36px] tracking-[-0.01em] text-ink md:text-[36px] md:leading-[44px]">
                  {room.type} · Room {room.number}
                </h1>
                <p className="mt-2 mb-0 font-sans text-[14px] leading-[22px] text-muted">
                  Room {room.number} · {room.type} · {plural(room.capacity, "guest")}
                </p>
              </div>

              {room.facilities.length > 0 ? (
                <div className="flex flex-wrap gap-2" aria-label="Room facilities">
                  {room.facilities.map((facility) => (
                    <Tag
                      key={facility}
                      icon={getFacilityIcon(facility)}
                      className="m-0 inline-flex items-center gap-1.5 rounded-sm border border-line bg-neutral-0 px-2.5 py-1 font-sans text-[13px] font-medium leading-[20px] text-ink"
                    >
                      {facility}
                    </Tag>
                  ))}
                </div>
              ) : null}

              <RoomDescription key={`description-${room.id}`} description={room.description} />
            </div>

            <aside className="lg:col-span-4">
              <Suspense fallback={null}>
                <BookingCard room={room} />
              </Suspense>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
