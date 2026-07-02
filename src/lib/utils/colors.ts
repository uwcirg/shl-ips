const SOURCE_COLORS = [
  '#4C9BE8', // blue
  '#E8674C', // red-orange
  '#4CBE7A', // green
  '#B44CE8', // purple
  '#E8B94C', // amber
  '#4CE8E0', // teal
  '#E84C8B', // pink
  '#8BE84C', // lime
  '#4C67E8', // indigo
  // '#E8A54C', // orange
  '#4CE87A', // mint
  '#E84C4C', // red
  '#4CB4E8', // sky
  '#C8E84C', // yellow-green
  '#7A4CE8', // violet
  '#E8D44C', // yellow
  '#4CE8B4', // seafoam
  '#E8674C', // coral
  '#4C8BE8', // cornflower
  '#A4E84C', // chartreuse
  '#E84C4C', // strawberry
];

export function buildColorMap(keys: string[]): Map<string, string> {
  return new Map(keys.map((key, i) => [key, SOURCE_COLORS[i % SOURCE_COLORS.length]]));
}