export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function formatLabel(label: string): string {
  const prefix = "tw-";
  if (!label.startsWith(prefix)) {
    return prefix + label;
  }
  return label;
}
