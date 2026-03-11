// The landing-page app reads Groq credentials through Vite env vars during the
// prototype bootstrap flow on the application page.
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_GROQ_MODEL?: string;
  readonly VITE_GIPHY_API_KEY?: string;
  readonly VITE_IMGFLIP_USERNAME?: string;
  readonly VITE_IMGFLIP_PASSWORD?: string;
  readonly VITE_SAGE_ANNUAL_PAYMENT_LINK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
