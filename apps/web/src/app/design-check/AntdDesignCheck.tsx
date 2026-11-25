"use client";

import { useState } from "react";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Result,
  Select,
  Skeleton,
  Steps,
  Table,
  Tag,
} from "antd";
import type { TableColumnsType } from "antd";

type SampleBookingRow = {
  key: string;
  reference: string;
  room: string;
  dates: string;
  status: "Confirmed" | "Pending" | "Cancelled";
  total: string;
};

const SAMPLE_BOOKINGS: readonly SampleBookingRow[] = [
  {
    key: "bk-1041",
    reference: "BK-1041",
    room: "Deluxe 204",
    dates: "20-23 Dec",
    status: "Confirmed",
    total: "45,000",
  },
  {
    key: "bk-1040",
    reference: "BK-1040",
    room: "Suite 301",
    dates: "28-30 Dec",
    status: "Pending",
    total: "30,000",
  },
  {
    key: "bk-1039",
    reference: "BK-1039",
    room: "Single 102",
    dates: "02-03 Jan",
    status: "Cancelled",
    total: "12,000",
  },
];

const STATUS_TAG_COLOR: Record<SampleBookingRow["status"], "success" | "warning" | "error"> = {
  Confirmed: "success",
  Pending: "warning",
  Cancelled: "error",
};

const TABLE_COLUMNS: TableColumnsType<SampleBookingRow> = [
  { title: "Booking", dataIndex: "reference", key: "reference" },
  { title: "Room", dataIndex: "room", key: "room" },
  { title: "Dates", dataIndex: "dates", key: "dates" },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: SampleBookingRow["status"]) => (
      <Tag color={STATUS_TAG_COLOR[status]}>{status}</Tag>
    ),
  },
  {
    title: "Total",
    dataIndex: "total",
    key: "total",
    align: "right",
    render: (total: string) => <span className="tabular">{total}</span>,
  },
];

const ROOM_OPTIONS = [
  { value: "Single", label: "Single" },
  { value: "Double", label: "Double" },
  { value: "Deluxe", label: "Deluxe" },
  { value: "Suite", label: "Suite" },
];

export function AntdDesignCheck() {
  const { message, notification } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);

  return (
    <section className="mt-12 border-t border-line pt-12">
      <h2 className="mb-6 font-serif text-[24px] font-semibold leading-[32px] text-ink md:text-[28px] md:leading-[36px]">
        Ant Design
      </h2>

      <div className="space-y-8">
        <div className="rounded-lg border border-line bg-neutral-0 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h3 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
              Buttons
            </h3>
            <Button size="small" onClick={() => setLoadingToggle((prev) => !prev)}>
              {loadingToggle ? "Stop loading demo" : "Toggle loading demo"}
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-2 font-sans text-[13px] font-medium leading-[20px] text-muted">
                Primary (small, middle, large, disabled, loading)
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="primary" size="small" loading={loadingToggle}>
                  Book now
                </Button>
                <Button type="primary" size="middle" loading={loadingToggle}>
                  Book now
                </Button>
                <Button type="primary" size="large" loading={loadingToggle}>
                  Book now
                </Button>
                <Button type="primary" disabled>
                  Book now
                </Button>
                <Button type="primary" loading>
                  Book now
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2 font-sans text-[13px] font-medium leading-[20px] text-muted">
                Default / secondary (small, middle, large, disabled, loading)
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="small" loading={loadingToggle}>
                  View details
                </Button>
                <Button size="middle" loading={loadingToggle}>
                  View details
                </Button>
                <Button size="large" loading={loadingToggle}>
                  View details
                </Button>
                <Button disabled>View details</Button>
                <Button loading>View details</Button>
              </div>
            </div>

            <div>
              <div className="mb-2 font-sans text-[13px] font-medium leading-[20px] text-muted">
                Text (small, middle, large, disabled, loading)
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="text" size="small" loading={loadingToggle}>
                  View
                </Button>
                <Button type="text" size="middle" loading={loadingToggle}>
                  View
                </Button>
                <Button type="text" size="large" loading={loadingToggle}>
                  View
                </Button>
                <Button type="text" disabled>
                  View
                </Button>
                <Button type="text" loading>
                  View
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2 font-sans text-[13px] font-medium leading-[20px] text-muted">
                Danger solid (small, middle, large, disabled, loading)
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="primary" danger size="small" loading={loadingToggle}>
                  Delete
                </Button>
                <Button type="primary" danger size="middle" loading={loadingToggle}>
                  Delete
                </Button>
                <Button type="primary" danger size="large" loading={loadingToggle}>
                  Delete
                </Button>
                <Button type="primary" danger disabled>
                  Delete
                </Button>
                <Button type="primary" danger loading>
                  Delete
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2 font-sans text-[13px] font-medium leading-[20px] text-muted">
                Danger outline (small, middle, large, disabled, loading)
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button danger size="small" loading={loadingToggle}>
                  Cancel
                </Button>
                <Button danger size="middle" loading={loadingToggle}>
                  Cancel
                </Button>
                <Button danger size="large" loading={loadingToggle}>
                  Cancel
                </Button>
                <Button danger disabled>
                  Cancel
                </Button>
                <Button danger loading>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-neutral-0 p-6">
          <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
            Form controls
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="design-check-input-default"
                className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
              >
                Email
              </label>
              <Input id="design-check-input-default" placeholder="you@example.com" />
              <div className="mt-1.5 font-sans text-[13px] leading-[20px] text-muted">
                We never share it
              </div>
            </div>

            <div>
              <label
                htmlFor="design-check-input-error"
                className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
              >
                Email (error)
              </label>
              <Input
                id="design-check-input-error"
                status="error"
                defaultValue="ali@mail"
                aria-invalid="true"
                aria-describedby="design-check-input-error-text"
              />
              <div
                id="design-check-input-error-text"
                className="mt-1.5 flex items-center gap-1.5 font-sans text-[13px] leading-[20px] text-error"
              >
                <ExclamationCircleOutlined aria-hidden="true" />
                <span>Enter a valid email</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="design-check-input-disabled"
                className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
              >
                Email (disabled)
              </label>
              <Input id="design-check-input-disabled" disabled value="Locked" />
            </div>

            <div>
              <label
                htmlFor="design-check-select"
                className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
              >
                Room type
              </label>
              <Select
                id="design-check-select"
                className="w-full"
                placeholder="Select room type"
                options={ROOM_OPTIONS}
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="design-check-dates"
                className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
              >
                Stay dates
              </label>
              <DatePicker.RangePicker
                id="design-check-dates"
                className="w-full"
                placeholder={["Check-in", "Check-out"]}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-neutral-0 p-6">
          <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
            Table
          </h3>
          <div className="max-w-full overflow-x-auto">
            <Table<SampleBookingRow>
              columns={TABLE_COLUMNS}
              dataSource={[...SAMPLE_BOOKINGS]}
              pagination={false}
              scroll={{ x: "max-content" }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-neutral-0 p-6">
          <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
            Overlays, feedback, and steps
          </h3>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button onClick={() => setDrawerOpen(true)}>Open drawer</Button>
            <Popconfirm
              title="Delete this room?"
              description="This cannot be undone."
              okText="Delete"
              cancelText="Keep"
              okButtonProps={{ danger: true }}
              onConfirm={() => message.success("Room deleted")}
            >
              <Button danger>Delete room</Button>
            </Popconfirm>
            <Button type="primary" onClick={() => message.success("Booking confirmed")}>
              Show message
            </Button>
            <Button
              onClick={() =>
                notification.info({
                  message: "New message from reception",
                  description: "Check-in is ready from 2:00 PM.",
                  duration: 6,
                })
              }
            >
              Show notification
            </Button>
          </div>

          <div className="max-w-[640px]">
            <Steps
              current={1}
              items={[{ title: "Room" }, { title: "Details" }, { title: "Payment" }]}
            />
          </div>

          <Modal
            title="Add room"
            open={modalOpen}
            width={520}
            okText="Save"
            cancelText="Cancel"
            onOk={() => {
              setModalOpen(false);
              message.success("Room saved");
            }}
            onCancel={() => setModalOpen(false)}
          >
            <p className="font-sans text-[14px] leading-[22px] text-ink">
              Modal content preview matching the 520px form width and 12px radius.
            </p>
          </Modal>

          <Drawer
            title="Booking details"
            open={drawerOpen}
            width={420}
            onClose={() => setDrawerOpen(false)}
          >
            <p className="font-sans text-[14px] leading-[22px] text-ink">
              Drawer content preview at 420px width for booking details.
            </p>
          </Drawer>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-line bg-neutral-0 p-6">
            <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink">
              Skeleton
            </h3>
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>

          <div className="rounded-lg border border-line bg-neutral-0 p-6">
            <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink">
              Empty
            </h3>
            <Empty description="No bookings yet. Browse rooms to make your first booking.">
              <Button type="primary">Browse rooms</Button>
            </Empty>
          </div>

          <div className="rounded-lg border border-line bg-neutral-0 p-6">
            <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink">
              Result
            </h3>
            <Result
              status="success"
              title="Booking confirmed"
              subTitle="A confirmation was sent to your email."
              extra={<Button type="primary">View booking</Button>}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
