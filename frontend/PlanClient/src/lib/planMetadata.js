const formatNumber = value => {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 }).format(number)
    : String(value);
};

export function formatPlanMetadata(plan = {}) {
  const items = [];
  if (plan.bedrooms !== null && plan.bedrooms !== undefined && plan.bedrooms !== '') items.push({ label: 'Bedrooms', value: formatNumber(plan.bedrooms) });
  if (plan.storeys !== null && plan.storeys !== undefined && plan.storeys !== '') items.push({ label: 'Storeys', value: formatNumber(plan.storeys) });
  if (plan.floor_area !== null && plan.floor_area !== undefined && plan.floor_area !== '') {
    const unit = plan.floor_area_unit === 'sqft' ? 'sq ft' : 'm²';
    items.push({ label: 'Floor area', value: `${formatNumber(plan.floor_area)} ${unit}` });
  }
  if (plan.plot_requirements?.trim()) items.push({ label: 'Plot requirements', value: plan.plot_requirements.trim() });
  return items;
}

export function getPackageContents(plan = {}) {
  return Array.isArray(plan.package_contents)
    ? plan.package_contents.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
    : [];
}
