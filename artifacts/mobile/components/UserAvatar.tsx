import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";

interface UserAvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  editable?: boolean;
  uploading?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function UserAvatar({
  uri,
  name,
  size = 52,
  editable = false,
  uploading = false,
  onPress,
  accessibilityLabel,
}: UserAvatarProps) {
  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const badgeSize  = Math.round(size * 0.34);
  const iconSize   = Math.round(size * 0.52);
  const fontSize   = Math.round(size * 0.36);
  const borderRad  = size / 2;

  const content = (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: borderRad },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: borderRad }}
          contentFit="cover"
          accessibilityLabel={accessibilityLabel ?? `${name ?? ""} profil fotoğrafı`}
        />
      ) : initials ? (
        <View
          style={[styles.initialsWrap, { width: size, height: size, borderRadius: borderRad }]}
        >
          <Text style={[styles.initials, { fontSize, color: "#7B5EA7" }]}>
            {initials}
          </Text>
        </View>
      ) : (
        <View
          style={[styles.iconWrap, { width: size, height: size, borderRadius: borderRad }]}
        >
          <Icon name="person" size={iconSize} color="#7B5EA7" />
        </View>
      )}

      {/* Upload overlay */}
      {uploading && (
        <View style={[styles.overlay, { borderRadius: borderRad }]}>
          <ActivityIndicator color="#FFF" size="small" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={editable ? "Profil fotoğrafını değiştir" : (accessibilityLabel ?? "")}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  circle: {
    overflow: "hidden",
    backgroundColor: "rgba(123,94,167,0.12)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  initialsWrap: {
    backgroundColor: "rgba(123,94,167,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "Inter_700Bold",
  },
  iconWrap: {
    backgroundColor: "rgba(123,94,167,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    backgroundColor: "#7B5EA7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
});
