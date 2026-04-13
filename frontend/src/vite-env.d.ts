/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OAUTH_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
