import React from "react";
import { Icon } from "@/components/Icon";

export type AppIconName =
  | "home" | "map" | "feed" | "animals" | "pets" | "account"
  | "add" | "edit" | "delete" | "close" | "back" | "forward"
  | "more" | "search" | "filter" | "refresh" | "share"
  | "save" | "saved" | "camera" | "image" | "location"
  | "navigate" | "healthy" | "injured" | "unknown" | "open"
  | "check" | "warning" | "info" | "heart" | "heartFilled"
  | "comment" | "notification" | "message" | "user" | "users"
  | "eye" | "eyeOff" | "lock" | "key" | "logout"
  | "paw" | "pawOutline" | "vaccine" | "medical" | "food"
  | "calendar" | "clock" | "settings" | "phone" | "mail"
  | "externalLink" | "cloud" | "send" | "attach"
  | "chevronDown" | "chevronUp" | "star" | "starFilled"
  | "flag" | "link";

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: object;
}

export function AppIcon({ name, size = 20, color = "#7B5EA7", strokeWidth = 2, style }: AppIconProps) {
  return <Icon name={name} size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}
