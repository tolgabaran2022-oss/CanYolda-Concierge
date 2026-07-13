import { Ionicons } from "@expo/vector-icons";
import React from "react";

const ICON_MAP = {
  home:          "home-outline",
  map:           "map-outline",
  feed:          "newspaper-outline",
  animals:       "paw-outline",
  pets:          "heart-outline",
  account:       "person-outline",
  add:           "add",
  edit:          "pencil",
  delete:        "trash-outline",
  close:         "close",
  back:          "chevron-back",
  forward:       "chevron-forward",
  more:          "ellipsis-horizontal",
  search:        "search-outline",
  filter:        "options-outline",
  refresh:       "refresh-outline",
  share:         "share-outline",
  save:          "bookmark-outline",
  saved:         "bookmark",
  camera:        "camera-outline",
  image:         "image-outline",
  location:      "location-outline",
  navigate:      "navigate",
  healthy:       "checkmark-circle-outline",
  injured:       "bandage-outline",
  unknown:       "help-circle-outline",
  open:          "alert-circle-outline",
  check:         "checkmark",
  warning:       "warning-outline",
  info:          "information-circle-outline",
  heart:         "heart-outline",
  heartFilled:   "heart",
  comment:       "chatbubble-outline",
  notification:  "notifications-outline",
  message:       "mail-outline",
  user:          "person-outline",
  users:         "people-outline",
  eye:           "eye-outline",
  eyeOff:        "eye-off-outline",
  lock:          "lock-closed-outline",
  key:           "key-outline",
  logout:        "log-out-outline",
  paw:           "paw",
  pawOutline:    "paw-outline",
  vaccine:       "medical-outline",
  medical:       "pulse-outline",
  food:          "restaurant-outline",
  calendar:      "calendar-outline",
  clock:         "time-outline",
  settings:      "settings-outline",
  phone:         "call-outline",
  mail:          "mail-outline",
  externalLink:  "open-outline",
  cloud:         "cloud-offline-outline",
  send:          "send-outline",
  attach:        "attach-outline",
  chevronDown:   "chevron-down",
  chevronUp:     "chevron-up",
  star:          "star-outline",
  starFilled:    "star",
  flag:          "flag-outline",
  link:          "link-outline",
} as const;

export type AppIconName = keyof typeof ICON_MAP;

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: object;
}

export function AppIcon({ name, size = 20, color = "#7B5EA7", style }: AppIconProps) {
  return (
    <Ionicons
      name={ICON_MAP[name] as keyof typeof Ionicons.glyphMap}
      size={size}
      color={color}
      style={style as any}
    />
  );
}
