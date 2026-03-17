export function generateBookingCode(): string {
  const timestamp = Date.now().toString();
  const last5 = timestamp.slice(-5);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, "0");
  const code = (parseInt(last5) + parseInt(random)).toString().padStart(5, "0").slice(-5);
  return `R-${code}`;
}
