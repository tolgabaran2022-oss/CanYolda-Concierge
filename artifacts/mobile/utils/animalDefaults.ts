import { Image as RNImage } from "react-native";

export type AnimalType = "kedi" | "kopek" | "kus" | "diger";

export const ANIMAL_TYPES: { key: AnimalType; label: string; emoji: string }[] = [
  { key: "kedi", label: "Kedi", emoji: "🐱" },
  { key: "kopek", label: "Köpek", emoji: "🐶" },
  { key: "kus", label: "Kuş", emoji: "🐦" },
  { key: "diger", label: "Diğer", emoji: "🐾" },
];

const DEFAULT_ANIMAL_ASSETS: Record<AnimalType, number> = {
  kedi: require("@/assets/images/animal-default-cat.png"),
  kopek: require("@/assets/images/animal-default-dog.png"),
  kus: require("@/assets/images/animal-default-bird.png"),
  diger: require("@/assets/images/animal-default-other.png"),
};

export function getDefaultAnimalImageUri(type?: AnimalType): string {
  const asset = DEFAULT_ANIMAL_ASSETS[type ?? "diger"];
  return RNImage.resolveAssetSource(asset).uri;
}
