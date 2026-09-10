/* EMAIL is still a placeholder: the address is not real. */

export const EMAIL = "hello@kleczewsky.com";

export interface Profile {
  label: string;
  url: string;
}

/** Add real profile URLs here; empty entries are not rendered. */
export const PROFILES: Profile[] = [
  { label: "LinkedIn", url: "https://www.linkedin.com/in/kleczewsky/" },
];
