export function filterDesigns(plans = [], { search = '', status = 'all' } = {}) {
  const term = search.trim().toLowerCase();
  return plans.filter(plan => {
    const matchesStatus = status === 'all' || plan.status === status;
    const haystack = [plan.title, plan.description, plan.category_name, plan.category_group]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return matchesStatus && (!term || haystack.includes(term));
  });
}
