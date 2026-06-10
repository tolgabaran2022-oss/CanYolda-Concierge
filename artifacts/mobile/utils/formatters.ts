export function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const date = new Date(timestamp).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  if (hours < 24) return `${hours} sa önce`;
  if (days === 1) return "Dün";
  return `${days} gün önce`;
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
