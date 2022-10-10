// Normalize to [-1 , 1]
export function normalizeValue(val, max, min) {
    return (val - min) / (max - min) * 2 - 1;
}