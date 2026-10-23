// Client-safe option lists for vehicle forms (sell, deals) and filters.

export const MAKES = ["Toyota", "Honda", "Suzuki", "Hyundai", "Kia", "Changan", "Nissan", "BYD", "Jetour", "Jaecoo", "Tesla", "Lexus", "Mercedes", "BMW", "Audi", "Porsche", "Mini", "Jaguar", "Bentley", "Ferrari", "Lamborghini", "Ford", "Yamaha", "Kawasaki", "Other"];
export const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"];
export const TRANSMISSIONS = ["Manual", "Automatic", "Semi-automatic"];
export const CONDITIONS = ["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const conditionLabel = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();
