export const formatPrice = (price) => {
  if (price === null || price === undefined || price === '' || !Number.isFinite(Number(price))) {
    return 'Price unavailable';
  }
  return `Ksh ${Number(price).toLocaleString('en-KE', { maximumFractionDigits: 4 })}`;
};
