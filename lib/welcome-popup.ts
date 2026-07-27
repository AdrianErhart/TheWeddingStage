/**
 * Geteiltes Hilfsmodul `welcome-popup` fuer die Anwendungslogik.
 * Stellt wiederverwendbare Funktionen fuer Domainregeln, Datenzugriff oder Infrastrukturdetails bereit, damit diese zentral gepflegt werden koennen.
 */
export const WELCOME_POPUP_STORAGE_KEY = "theweddingstage:welcome-popup";

export type WelcomePopupPayload = {
  profileHref: string;
};