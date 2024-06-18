// Utility function to escape HTML special characters
export function escapeHtml(unsafe: string): string {
   return unsafe.replace(/[&<>"']/g, function (m) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[m] || "";
   });
}
