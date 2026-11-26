"use client";

import type { ReactElement } from "react";
import {
  CheckOutlined,
  CoffeeOutlined,
  ControlOutlined,
  DesktopOutlined,
  FireOutlined,
  HomeOutlined,
  InboxOutlined,
  LaptopOutlined,
  RestOutlined,
  StarOutlined,
  SunOutlined,
  TableOutlined,
  WifiOutlined,
} from "@ant-design/icons";

const FACILITY_ICON_CLASS = "text-[16px] text-muted";

function renderIcon(facility: string): ReactElement {
  const normalized = facility.trim().toLowerCase();

  switch (normalized) {
    case "wi-fi":
    case "wifi":
      return <WifiOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "air conditioning":
    case "ac":
    case "climate control":
      return <ControlOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "tv":
    case "television":
      return <DesktopOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "desk":
    case "workspace":
      return <LaptopOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "breakfast":
    case "coffee maker":
    case "coffee":
    case "tea":
      return <CoffeeOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "mini fridge":
    case "fridge":
    case "minibar":
      return <InboxOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "balcony":
    case "terrace":
      return <SunOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "seating area":
    case "lounge":
      return <RestOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "living room":
      return <HomeOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "kitchenette":
      return <FireOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "dining area":
      return <TableOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    case "bathtub":
    case "bath":
      return <StarOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
    default:
      return <CheckOutlined className={FACILITY_ICON_CLASS} aria-hidden="true" />;
  }
}

export function getFacilityIcon(facility: string): ReactElement {
  return renderIcon(facility);
}
