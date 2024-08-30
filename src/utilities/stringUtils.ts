export function capitalizeFirstLetter(string: string) {
   return string.charAt(0).toUpperCase() + string.slice(1);
}

export function formatLabel(label: string): string {
   const prefix = "sw-";
   if (!label.startsWith(prefix)) {
      label = prefix + label;
   }
   label = label.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
   label = label.replace(/\s+/g, '-');
   return label;
}