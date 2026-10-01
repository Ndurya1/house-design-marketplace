export function normalizeSellerProfile(profile) {
  if (!profile || typeof profile !== 'object' || profile.id == null) return null;
  return {
    id: profile.id,
    phone: profile.phone ?? '',
    bio: profile.bio ?? '',
    avatar: profile.avatar ?? null,
  };
}

export function firstSellerProfile(payload) {
  if (payload && !Array.isArray(payload) && payload.id != null) return normalizeSellerProfile(payload);
  const profiles = Array.isArray(payload) ? payload : payload?.results;
  return normalizeSellerProfile(profiles?.[0]);
}

export function validateSellerProfile(profile) {
  const errors = {};
  const phone = String(profile?.phone ?? '').trim();
  if (!phone) errors.phone = 'Phone number is required.';
  else if (phone.length > 15) errors.phone = 'Phone number must be 15 characters or fewer.';
  return errors;
}
