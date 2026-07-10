export function formatGender(raw?: string): string {
  if (!raw) return "";
  const v = raw.trim().toLowerCase();
  if (v === "female" || v === "f" || v === "dişi") return "Dişi";
  if (v === "male"   || v === "m" || v === "erkek") return "Erkek";
  return "Bilinmiyor";
}

export function formatSpecies(raw?: string): string {
  if (!raw) return "";
  const v = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    dog: "Köpek", köpek: "Köpek", kopek: "Köpek",
    cat: "Kedi",  kedi: "Kedi",
    bird: "Kuş",  kuş: "Kuş",    kus: "Kuş",
    rabbit: "Tavşan", tavşan: "Tavşan", tavsan: "Tavşan",
    hamster: "Hamster",
    fish: "Balık", balık: "Balık", balik: "Balık",
    reptile: "Sürüngen", sürüngen: "Sürüngen",
    other: "Diğer", diğer: "Diğer", diger: "Diğer",
  };
  return map[v] ?? raw;
}

export function formatAge(birthDate?: string, ageStr?: string): string {
  if (birthDate && birthDate.trim()) {
    try {
      const birth = new Date(birthDate);
      if (!isNaN(birth.getTime())) {
        const now  = new Date();
        let years  = now.getFullYear() - birth.getFullYear();
        let months = now.getMonth()    - birth.getMonth();
        if (now.getDate() < birth.getDate()) months -= 1;
        if (months < 0) { years -= 1; months += 12; }
        if (years <= 0 && months <= 0) return "1 aylık";
        if (years <= 0) return `${months} aylık`;
        if (months === 0) return `${years} yaş`;
        return `${years} yaş ${months} ay`;
      }
    } catch { /* fall through */ }
  }
  if (ageStr && ageStr.trim()) return ageStr;
  return "";
}

export function formatWeight(raw?: string): string {
  if (!raw || !raw.trim()) return "";
  const n = parseFloat(raw.replace(",", "."));
  if (isNaN(n)) return "";
  return `${n.toLocaleString("tr-TR")} kg`;
}

export function buildPetSubtitle(
  type?: string,
  breed?: string,
  gender?: string,
): string {
  const parts: string[] = [];
  const sp = breed && breed.trim() ? breed : formatSpecies(type);
  if (sp) parts.push(sp);
  const g = formatGender(gender);
  if (g && g !== "Bilinmiyor") parts.push(g);
  return parts.join(" • ");
}

export function buildPetMeta(
  birthDate?: string,
  ageStr?: string,
  weight?: string,
): string {
  const parts: string[] = [];
  const age = formatAge(birthDate, ageStr);
  if (age) parts.push(age);
  const w = formatWeight(weight);
  if (w) parts.push(w);
  return parts.join(" • ");
}
