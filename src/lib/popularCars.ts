// The footer's "Popular cars & bikes" lists (components/Footer.tsx): the vehicles people in Pakistan look for most,
// grouped by where they come from. Client-safe and unit-tested.

import { MAKES } from "@/lib/vehicleOptions";

export type PopularGroup = { title: string; cars: [make: string, model: string][] };

export const POPULAR_CARS: PopularGroup[] = [
  {
    title: "Japanese cars",
    cars: [
      ["Toyota", "Corolla"], ["Toyota", "Yaris"], ["Toyota", "Corolla Cross"], ["Toyota", "Fortuner"], ["Toyota", "Hilux"],
      ["Toyota", "Land Cruiser"], ["Toyota", "Prado"], ["Toyota", "Prius"], ["Toyota", "Aqua"], ["Toyota", "Vitz"],
      ["Toyota", "Passo"], ["Honda", "Civic"], ["Honda", "City"], ["Honda", "BR-V"], ["Honda", "HR-V"], ["Honda", "Vezel"],
      ["Suzuki", "Alto"], ["Suzuki", "Cultus"], ["Suzuki", "Wagon R"], ["Suzuki", "Swift"], ["Suzuki", "Mehran"],
      ["Suzuki", "Bolan"], ["Suzuki", "Every"], ["Daihatsu", "Mira"], ["Daihatsu", "Move"], ["Nissan", "Dayz"],
      ["Mitsubishi", "Lancer"], ["Mitsubishi", "Pajero"],
    ],
  },
  {
    title: "Chinese cars",
    cars: [
      ["Changan", "Alsvin"], ["Changan", "Oshan X7"], ["Changan", "Karvaan"], ["Haval", "H6"], ["Haval", "Jolion"],
      ["MG", "HS"], ["MG", "ZS"], ["BYD", "Atto 3"], ["BYD", "Seal"], ["BYD", "Shark 6"], ["Chery", "Tiggo 4 Pro"],
      ["Chery", "Tiggo 8 Pro"], ["Jetour", "X70"], ["Jetour", "Dashing"], ["Jaecoo", "J7"], ["Tank", "500"],
      ["DFSK", "Glory 580"], ["FAW", "V2"],
    ],
  },
  {
    title: "Korean cars",
    cars: [
      ["Hyundai", "Tucson"], ["Hyundai", "Elantra"], ["Hyundai", "Sonata"], ["Hyundai", "Santa Fe"], ["Kia", "Sportage"],
      ["Kia", "Picanto"], ["Kia", "Stonic"], ["Kia", "Sorento"],
    ],
  },
  {
    title: "Other cars",
    cars: [
      ["Proton", "Saga"], ["Proton", "X70"], ["Mercedes", "C-Class"], ["Mercedes", "E-Class"], ["BMW", "3 Series"],
      ["Audi", "A4"], ["Audi", "A6"],
    ],
  },
  {
    title: "Bikes",
    cars: [
      ["Honda", "CD 70"], ["Honda", "CG 125"], ["Honda", "Pridor"], ["Yamaha", "YBR 125"], ["Suzuki", "GS 150"],
      ["Suzuki", "GD 110"], ["United", "US 70"], ["Road Prince", "70"],
    ],
  },
];

/**
 * Browse filtered to one vehicle. A make sellers can pick (MAKES) becomes the make filter with the model as the
 * search; any other make (Haval, MG, Daihatsu…, listed as "Other") is searched as text, which matches the title.
 */
export function popularCarHref(make: string, model: string): string {
  return MAKES.includes(make)
    ? `/listings?make=${encodeURIComponent(make)}&search=${encodeURIComponent(model)}`
    : `/listings?search=${encodeURIComponent(`${make} ${model}`)}`;
}

