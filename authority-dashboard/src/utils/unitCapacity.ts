const STORAGE_KEY = "authority_unit_capacity_v1";
export const MAX_AUTHORITY_UNITS = 8;
export const UNIT_CAPACITY_EVENT = "authority-unit-capacity-updated";

type UnitRecord = {
  usedUnits: number;
  updatedAt: string;
};

type UnitRecordMap = Record<string, UnitRecord>;

export type UnitCapacitySnapshot = {
  authorityKey: string;
  totalUnits: number;
  usedUnits: number;
  availableUnits: number;
  updatedAt: string;
};

const toIsoNow = () => new Date().toISOString();

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getAuthorityKeyFromToken = (): string => {
  const token = localStorage.getItem("token");
  if (!token) return "authority:anonymous";

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const rawId =
      payload.id ||
      payload._id ||
      payload.authorityId ||
      payload.sub ||
      "anonymous";
    return `authority:${String(rawId)}`;
  } catch {
    return "authority:anonymous";
  }
};

const readMap = (): UnitRecordMap => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as UnitRecordMap;
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
};

const writeMap = (map: UnitRecordMap) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(UNIT_CAPACITY_EVENT));
};

const toSnapshot = (
  authorityKey: string,
  record?: UnitRecord,
): UnitCapacitySnapshot => {
  const used = clamp(Number(record?.usedUnits || 0), 0, MAX_AUTHORITY_UNITS);
  return {
    authorityKey,
    totalUnits: MAX_AUTHORITY_UNITS,
    usedUnits: used,
    availableUnits: MAX_AUTHORITY_UNITS - used,
    updatedAt: record?.updatedAt || toIsoNow(),
  };
};

export async function getUnitCapacitySnapshot(): Promise<UnitCapacitySnapshot> {
  const authorityKey = getAuthorityKeyFromToken();
  const map = readMap();
  return toSnapshot(authorityKey, map[authorityKey]);
}

export async function consumeOneUnit(): Promise<UnitCapacitySnapshot> {
  const authorityKey = getAuthorityKeyFromToken();
  const map = readMap();
  const current = toSnapshot(authorityKey, map[authorityKey]);

  if (current.availableUnits <= 0) {
    throw new Error("No units left. Maximum capacity of 8 reached.");
  }

  const nextUsed = clamp(current.usedUnits + 1, 0, MAX_AUTHORITY_UNITS);
  map[authorityKey] = {
    usedUnits: nextUsed,
    updatedAt: toIsoNow(),
  };
  writeMap(map);
  return toSnapshot(authorityKey, map[authorityKey]);
}

export async function releaseOneUnit(): Promise<UnitCapacitySnapshot> {
  const authorityKey = getAuthorityKeyFromToken();
  const map = readMap();
  const current = toSnapshot(authorityKey, map[authorityKey]);
  const nextUsed = clamp(current.usedUnits - 1, 0, MAX_AUTHORITY_UNITS);
  map[authorityKey] = {
    usedUnits: nextUsed,
    updatedAt: toIsoNow(),
  };
  writeMap(map);

  return toSnapshot(authorityKey, map[authorityKey]);
}
