import type { ReactNode } from 'react';
import { FactorProvider } from './factors';

/**
 * Envoltorio diferible del proveedor de factores.
 * Solo las rutas que calculan, informan o gestionan factores lo cargan;
 * la portada y el onboarding no pagan el costo del catálogo base.
 */
export function FactorScope({ children }: { children: ReactNode }) {
  return <FactorProvider>{children}</FactorProvider>;
}
