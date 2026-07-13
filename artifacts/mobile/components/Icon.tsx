import React from "react";
import { View } from "react-native";
import {
  Activity,
  AlertCircle,
  Bird,
  Cat,
  Dog,
  AlertTriangle,
  ArrowLeft,
  AtSign,
  Barcode,
  Bell,
  Bookmark,
  BookOpen,
  Box,
  Calendar,
  Camera,
  CameraOff,
  Check,
  CheckCircle,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleUser,
  Clock,
  CloudOff,
  CreditCard,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Flag,
  Grid3X3,
  Heart,
  HeartPulse,
  HelpCircle,
  Home,
  Hourglass,
  Image,
  Images,
  Info,
  KeyRound,
  Link,
  List,
  Lock,
  LogOut,
  Mail,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Navigation,
  Newspaper,
  Paperclip,
  PawPrint,
  Pencil,
  Phone,
  Plus,
  PlusCircle,
  RefreshCw,
  Repeat,
  Rocket,
  Scale,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Timer,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Users,
  UtensilsCrossed,
  Video,
  X,
  XCircle,
  Zap,
} from "lucide-react-native";

type LucideIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const ICON_MAP: Record<string, LucideIcon> = {
  // ── Navigation ──────────────────────────────────────
  "chevron-back":        ChevronLeft,
  "chevron-forward":     ChevronRight,
  "chevron-down":        ChevronDown,
  "chevron-up":          ChevronUp,
  "arrow-back":          ArrowLeft,
  "navigate":            Navigation,
  "navigate-outline":    Navigation,
  "back":                ChevronLeft,
  "forward":             ChevronRight,

  // ── Animal / Nature ──────────────────────────────────
  "paw":                 PawPrint,
  "paw-outline":         PawPrint,
  "pawOutline":          PawPrint,
  "cat":                 Cat,
  "dog":                 Dog,
  "bird":                Bird,

  // ── Heart ────────────────────────────────────────────
  "heart":               Heart,
  "heart-outline":       Heart,
  "heartFilled":         Heart,
  "heart-circle":        Heart,

  // ── User / People ────────────────────────────────────
  "person":              User,
  "person-outline":      User,
  "user":                User,
  "people-outline":      Users,
  "people":              Users,
  "users":               Users,
  "person-add":          UserPlus,
  "person-add-outline":  UserPlus,
  "person-circle":       CircleUser,

  // ── Add / Remove ─────────────────────────────────────
  "add":                 Plus,
  "add-circle-outline":  PlusCircle,
  "close":               X,
  "close-circle":        XCircle,
  "close-circle-outline": XCircle,
  "x":                   X,

  // ── Search / Filter ──────────────────────────────────
  "search":              Search,
  "search-outline":      Search,
  "options-outline":     SlidersHorizontal,
  "filter-outline":      SlidersHorizontal,
  "filter":              SlidersHorizontal,

  // ── Location / Map ───────────────────────────────────
  "location":            MapPin,
  "location-outline":    MapPin,
  "location-sharp":      MapPin,
  "map-pin":             MapPin,
  "map":                 Map,
  "map-outline":         Map,

  // ── Edit / Actions ───────────────────────────────────
  "pencil":              Pencil,
  "pencil-outline":      Pencil,
  "create-outline":      Pencil,
  "edit":                Pencil,
  "trash-outline":       Trash2,
  "delete":              Trash2,
  "ellipsis-horizontal": MoreHorizontal,
  "more-horizontal":     MoreHorizontal,
  "more":                MoreHorizontal,
  "share-outline":       Share2,
  "share":               Share2,
  "bookmark":            Bookmark,
  "bookmark-outline":    Bookmark,
  "save":                Bookmark,
  "saved":               Bookmark,
  "refresh-outline":     RefreshCw,
  "refresh":             RefreshCw,
  "sync-outline":        RefreshCw,
  "repeat-outline":      Repeat,
  "menu":                Menu,
  "grid":                Grid3X3,
  "list":                List,
  "list-outline":        List,

  // ── Camera / Media ───────────────────────────────────
  "camera":              Camera,
  "camera-outline":      Camera,
  "camera-reverse-outline": CameraOff,
  "image-outline":       Image,
  "images-outline":      Images,
  "images":              Images,
  "image":               Image,
  "videocam-outline":    Video,
  "attach-outline":      Paperclip,
  "attach":              Paperclip,
  "mic-outline":         Mic,

  // ── Communication ────────────────────────────────────
  "chatbubble":               MessageCircle,
  "chatbubble-outline":       MessageCircle,
  "chatbubble-ellipses-outline": MessageCircle,
  "chatbubble-ellipses":      MessageCircle,
  "chatbubbles-outline":      MessageCircle,
  "comment":                  MessageCircle,
  "mail":                     Mail,
  "mail-outline":             Mail,
  "message":                  Mail,
  "call-outline":             Phone,
  "phone":                    Phone,
  "send":                     Send,
  "send-outline":             Send,
  "paper-plane-outline":      Send,
  "notifications-outline":    Bell,
  "alarm-outline":            Bell,
  "notification":             Bell,
  "happy-outline":            Smile,

  // ── Status / Info ────────────────────────────────────
  "information-circle":       Info,
  "information-circle-outline": Info,
  "info":                     Info,
  "alert-circle":             AlertCircle,
  "alert-circle-outline":     AlertCircle,
  "warning-outline":          AlertTriangle,
  "warning":                  AlertTriangle,
  "checkmark":                Check,
  "checkmark-circle":         CheckCircle,
  "checkmark-circle-outline": CheckCircle,
  "check":                    Check,
  "healthy":                  CheckCircle,
  "checkmark-done":           CheckCheck,
  "hourglass-outline":        Hourglass,
  "cloud-offline-outline":    CloudOff,
  "cloud":                    CloudOff,
  "flag-outline":             Flag,
  "flag":                     Flag,
  "radio-button-on":          Check,
  "unknown":                  HelpCircle,
  "open":                     AlertCircle,

  // ── Auth / Security ──────────────────────────────────
  "lock-closed-outline":      Lock,
  "lock":                     Lock,
  "key-outline":              KeyRound,
  "key":                      KeyRound,
  "log-out-outline":          LogOut,
  "logout":                   LogOut,
  "eye":                      Eye,
  "eye-outline":              Eye,
  "eye-off-outline":          EyeOff,
  "eyeOff":                   EyeOff,
  "shield-checkmark":         ShieldCheck,
  "shield-checkmark-outline": ShieldCheck,
  "vaccine":                  ShieldCheck,

  // ── Health / Pet care ────────────────────────────────
  "medical-outline":          Stethoscope,
  "medkit-outline":           HeartPulse,
  "pulse-outline":            Activity,
  "medical":                  HeartPulse,
  "injured":                  HeartPulse,
  "restaurant-outline":       UtensilsCrossed,
  "food":                     UtensilsCrossed,
  "scale-outline":            Scale,
  "stethoscope":              Stethoscope,

  // ── Time ─────────────────────────────────────────────
  "calendar":                 Calendar,
  "calendar-outline":         Calendar,
  "time-outline":             Clock,
  "clock":                    Clock,
  "timer":                    Timer,

  // ── Misc ─────────────────────────────────────────────
  "settings-outline":         Settings,
  "settings":                 Settings,
  "newspaper-outline":        Newspaper,
  "feed":                     Newspaper,
  "home-outline":             Home,
  "home":                     Home,
  "link-outline":             Link,
  "link":                     Link,
  "open-outline":             ExternalLink,
  "externalLink":             ExternalLink,
  "barcode-outline":          Barcode,
  "card-outline":             CreditCard,
  "document-text-outline":    FileText,
  "rocket":                   Rocket,
  "rocket-outline":           Rocket,
  "sparkles":                 Sparkles,
  "flash":                    Zap,
  "trending-up":              TrendingUp,
  "trending-up-outline":      TrendingUp,
  "book-outline":             BookOpen,
  "at-outline":               AtSign,
  "cube-outline":             Box,
  "male":                     User,
  "female":                   User,
  "star":                     Star,
  "star-outline":             Star,
  "starFilled":               Star,
  "animals":                  PawPrint,
  "pets":                     Heart,
  "account":                  User,
  "map-outline-tab":          Map,
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: object;
}

export function Icon({ name, size = 24, color = "#000", strokeWidth = 2, style }: IconProps) {
  const IconComp = ICON_MAP[name];

  if (!IconComp) {
    if (__DEV__) {
      console.warn(`[Icon] Unknown icon name: "${name}" — using fallback`);
    }
    const el = <HelpCircle size={size} color={color} strokeWidth={strokeWidth} />;
    return style ? <View style={style as any}>{el}</View> : el;
  }

  const el = <IconComp size={size} color={color} strokeWidth={strokeWidth} />;
  return style ? <View style={style as any}>{el}</View> : el;
}
