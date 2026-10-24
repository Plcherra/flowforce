export type PickerPerson = {
  id: string;
  name: string;
  role: string | null;
  level: string | null;
};

export function filterPickerPeople(
  people: PickerPerson[],
  query: string,
  role: string | null,
  level: string | null,
): PickerPerson[] {
  const needle = query.trim().toLowerCase();
  return people.filter((person) => {
    if (role && person.role !== role) return false;
    if (level && person.level !== level) return false;
    if (!needle) return true;
    return (
      person.name.toLowerCase().includes(needle) ||
      (person.role ?? "").toLowerCase().includes(needle)
    );
  });
}

export function pickerRoles(people: PickerPerson[]): string[] {
  return [...new Set(people.map((person) => person.role).filter((role): role is string => Boolean(role)))].sort();
}

export function pickerLevels(people: PickerPerson[]): string[] {
  return [...new Set(people.map((person) => person.level).filter((level): level is string => Boolean(level)))].sort();
}
