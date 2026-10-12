// Provinces and their main cities for location browsing. Client-safe.
// The capital is listed separately so it can be pinned to the top; the rest are roughly by size.

export type Province = {
  id: string;
  name: string;
  short: string;
  /** Shorter label for narrow screens, when the full name doesn't fit */
  mobileName?: string;
  capital: string;
  cities: string[];
};

export const PROVINCES: Province[] = [
  {
    id: "sindh",
    name: "Sindh",
    short: "SD",
    capital: "Karachi",
    cities: ["Hyderabad", "Sukkur", "Larkana", "Nawabshah", "Mirpur Khas", "Jacobabad", "Shikarpur", "Khairpur", "Dadu", "Thatta", "Badin"],
  },
  {
    id: "punjab",
    name: "Punjab",
    short: "PB",
    capital: "Lahore",
    cities: ["Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sialkot", "Bahawalpur", "Sargodha", "Sahiwal", "Sheikhupura", "Gujrat", "Rahim Yar Khan", "Jhelum", "Dera Ghazi Khan"],
  },
  {
    id: "kpk",
    name: "Khyber Pakhtunkhwa",
    mobileName: "KPK",
    short: "KP",
    capital: "Peshawar",
    cities: ["Mardan", "Abbottabad", "Mingora", "Kohat", "Dera Ismail Khan", "Mansehra", "Nowshera", "Bannu", "Charsadda", "Swabi"],
  },
  {
    id: "balochistan",
    name: "Balochistan",
    short: "BL",
    capital: "Quetta",
    cities: ["Gwadar", "Turbat", "Khuzdar", "Hub", "Sibi", "Chaman", "Zhob", "Loralai", "Dera Murad Jamali"],
  },
];

/** Islamabad is federal territory, not part of a province, so it is offered on its own. */
export const FEDERAL_CAPITAL = "Islamabad";
