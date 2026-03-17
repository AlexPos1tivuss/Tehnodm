export interface Slot {
  time: string;
  available: boolean;
}

export function generateSlots(date: string, bookedTimes: string[]): Slot[] {
  const slots: Slot[] = [];
  const bookedSet = new Set(bookedTimes);

  for (let hour = 9; hour < 18; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      slots.push({
        time,
        available: !bookedSet.has(time),
      });
    }
  }

  return slots;
}

export function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}
