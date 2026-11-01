/**
 * Resuelve un archivo de `public/` respetando la base configurada por Vite.
 * Permite servir la app tanto en la raíz como en un subdirectorio
 * (por ejemplo, GitHub Pages: /Calculadora-hidrica-y-carbono/).
 */
export function publicAsset(file: string): string {
  return `${import.meta.env.BASE_URL}${file.replace(/^\/+/, '')}`;
}
