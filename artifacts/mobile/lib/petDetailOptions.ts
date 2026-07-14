export type DetailOption = { value: string; label: string };

export const PET_DETAIL_OPTIONS = {
  healthStatus: [
    { value: "good",           label: "İyi" },
    { value: "under_treatment", label: "Tedavi Görüyor" },
    { value: "special_care",   label: "Özel Bakım Gerekiyor" },
    { value: "unknown",        label: "Bilinmiyor" },
  ] as DetailOption[],

  vaccinationStatus: [
    { value: "vaccinated",     label: "Var" },
    { value: "not_vaccinated", label: "Yok" },
    { value: "unknown",        label: "Bilinmiyor" },
  ] as DetailOption[],

  environmentType: [
    { value: "indoor",  label: "İç Mekan" },
    { value: "outdoor", label: "Dış Mekan" },
    { value: "both",    label: "İç ve Dış Mekan" },
  ] as DetailOption[],

  childCompatibility: [
    { value: "compatible",     label: "Uyumlu" },
    { value: "not_compatible", label: "Uyumlu Değil" },
    { value: "unknown",        label: "Bilinmiyor" },
  ] as DetailOption[],

  catCompatibility: [
    { value: "compatible",     label: "Uyumlu" },
    { value: "not_compatible", label: "Uyumlu Değil" },
    { value: "unknown",        label: "Bilinmiyor" },
  ] as DetailOption[],

  dogCompatibility: [
    { value: "compatible",     label: "Uyumlu" },
    { value: "not_compatible", label: "Uyumlu Değil" },
    { value: "unknown",        label: "Bilinmiyor" },
  ] as DetailOption[],

  toiletTraining: [
    { value: "trained",     label: "Var" },
    { value: "not_trained", label: "Yok" },
    { value: "in_training", label: "Eğitim Aşamasında" },
    { value: "unknown",     label: "Bilinmiyor" },
  ] as DetailOption[],
};

function getLabel(options: DetailOption[], value: string | null | undefined): string {
  if (!value) return "Bilinmiyor";
  return options.find((o) => o.value === value)?.label ?? "Bilinmiyor";
}

export const getHealthStatusLabel       = (v: string | null | undefined) => getLabel(PET_DETAIL_OPTIONS.healthStatus,       v);
export const getVaccinationStatusLabel  = (v: string | null | undefined) => getLabel(PET_DETAIL_OPTIONS.vaccinationStatus,  v);
export const getEnvironmentTypeLabel    = (v: string | null | undefined) => getLabel(PET_DETAIL_OPTIONS.environmentType,    v);
export const getChildCompatibilityLabel = (v: string | null | undefined) => getLabel(PET_DETAIL_OPTIONS.childCompatibility, v);
export const getCatCompatibilityLabel   = (v: string | null | undefined) => getLabel(PET_DETAIL_OPTIONS.catCompatibility,   v);
export const getDogCompatibilityLabel   = (v: string | null | undefined) => getLabel(PET_DETAIL_OPTIONS.dogCompatibility,   v);
export const getToiletTrainingLabel     = (v: string | null | undefined) => getLabel(PET_DETAIL_OPTIONS.toiletTraining,     v);
