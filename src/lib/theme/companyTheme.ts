export type CompanyBrand = {
  logoUrl?: string | null;
};

let brand: CompanyBrand = {};
const brandListeners = new Set<() => void>();

export function getCompanyBrand() {
  return brand;
}

export function subscribeCompanyBrand(listener: () => void) {
  brandListeners.add(listener);
  return () => {
    brandListeners.delete(listener);
  };
}

export function setCompanyBrand(next: CompanyBrand) {
  brand = { ...brand, ...next };
  brandListeners.forEach((listener) => listener());
}
