// Client-safe: the city picker on Browse. Listings store a free-text location, and the browse filter matches it
// by "contains", so a city here also finds "DHA, Karachi" and the like.

export const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Hyderabad",
  "Sialkot", "Gujranwala", "Bahawalpur", "Sargodha", "Abbottabad", "Sukkur",
] as const;

/** The visitor's chosen city, kept per browser ("" = all of Pakistan). Applied when Browse opens without a location. */
export const MY_CITY_KEY = "my-city";
