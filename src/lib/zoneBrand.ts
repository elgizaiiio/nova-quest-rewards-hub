/** @doc Brand helper — always returns "Ceyo" and brandText is a passthrough. */
export function getZoneBrand(): "Ceyo" {
  return "Ceyo";
}

/** Passthrough — no rebrand needed. */
export function brandText<T>(value: T, _brand: string = "Ceyo"): T {
  return value;
}
