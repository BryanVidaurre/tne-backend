// Convierte valores típicos de Excel (Date | number serial | string) a ISO date/datetime.
// Simplificado: si no se puede parsear, retorna null.
export function toIsoDate(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  // Excel serial date (aprox). XLSX a veces entrega number.
  if (typeof value === 'number' && isFinite(value)) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + value * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  const s = String(value).trim();
  if (!s) return null;

  // intenta parse nativo (acepta "4/8/25 14:19", "1/26/2025", etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return null;
}

export function toIsoDateTime(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'number' && isFinite(value)) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + value * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  const s = String(value).trim();
  if (!s) return null;

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();

  return null;
}
