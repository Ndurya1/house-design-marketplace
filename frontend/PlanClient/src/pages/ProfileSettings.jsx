import { useEffect, useRef, useState } from 'react';
import { ImagePlus, User } from 'lucide-react';
import { getMediaUrl, getSellerProfiles, updateSellerProfile } from '@/api';
import { Feedback } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/lib/useSession';
import { firstSellerProfile, validateSellerProfile } from '@/lib/profileSettings';

const emptyForm = { id: null, phone: '', bio: '', avatar: null };

export default function ProfileSettings() {
  const { user } = useSession();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarIsLocal, setAvatarIsLocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const localAvatarUrl = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    getSellerProfiles({ signal: controller.signal })
      .then(data => {
        if (cancelled) return;
        const nextProfile = firstSellerProfile(data);
        setProfile(nextProfile);
        if (nextProfile) {
          setForm({ ...nextProfile, avatar: null });
          setAvatarUrl(getMediaUrl(nextProfile.avatar));
        }
      })
      .catch(error => {
        if (!cancelled && error.name !== 'AbortError') setLoadError(error.message || 'Could not load your profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => () => {
    if (localAvatarUrl.current) URL.revokeObjectURL(localAvatarUrl.current);
  }, []);

  const replaceLocalAvatar = (file) => {
    if (localAvatarUrl.current) URL.revokeObjectURL(localAvatarUrl.current);
    const nextUrl = URL.createObjectURL(file);
    localAvatarUrl.current = nextUrl;
    setAvatarUrl(nextUrl);
    setAvatarIsLocal(true);
    setForm(current => ({ ...current, avatar: file }));
    setSaved(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const nextErrors = validateSellerProfile(form);
    setErrors(nextErrors);
    setSaved(false);
    setSaveError(null);
    if (Object.keys(nextErrors).length > 0 || !profile?.id) return;

    setSaving(true);
    const payload = new FormData();
    payload.append('phone', form.phone.trim());
    payload.append('bio', form.bio);
    if (form.avatar) payload.append('avatar', form.avatar);

    try {
      const updated = await updateSellerProfile(profile.id, payload);
      const nextProfile = firstSellerProfile(updated);
      setProfile(nextProfile);
      setForm({ ...nextProfile, avatar: null });
      if (localAvatarUrl.current) {
        URL.revokeObjectURL(localAvatarUrl.current);
        localAvatarUrl.current = null;
      }
      setAvatarIsLocal(false);
      setAvatarUrl(getMediaUrl(nextProfile.avatar));
      setSaved(true);
    } catch (error) {
      setSaveError(error.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="px-4 py-6 sm:px-6 lg:px-8"><Feedback kind="loading" title="Loading your profile" description="Retrieving your designer details." /></div>;
  if (loadError) return <div className="px-4 py-6 sm:px-6 lg:px-8"><Feedback kind="error" title="Could not load your profile" description={loadError} /></div>;
  if (!profile) return <div className="px-4 py-6 sm:px-6 lg:px-8"><Feedback title="Profile unavailable" description="A designer profile could not be found for this account." /></div>;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Account</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">Profile and settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Manage the designer details shown on your account.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Card className="h-fit bg-white">
            <CardHeader>
              <CardTitle>Profile summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-50">
                  {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" /> : <User aria-hidden="true" className="h-9 w-9 text-primary" />}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-lg font-semibold text-slate-900">{user?.name || 'Seller'}</p>
                  <p className="break-words text-sm text-slate-500">{user?.email || 'Email unavailable'}</p>
                </div>
              </div>
              <dl className="grid gap-4 border-t border-slate-200 pt-5 text-sm">
                <div><dt className="font-semibold text-slate-500">Phone</dt><dd className="mt-1 break-words text-slate-900">{profile.phone || 'Not provided'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Bio</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-900">{profile.bio || 'No bio added yet.'}</dd></div>
              </dl>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Edit profile</CardTitle>
            </CardHeader>
            <CardContent>
              {(saveError || saved) && <div role={saveError ? 'alert' : 'status'} className={`mb-5 rounded-lg border p-4 text-sm ${saveError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{saveError || 'Profile updated successfully.'}</div>}
              <form onSubmit={handleSave} className="grid gap-5">
                <div>
                  <label htmlFor="profile-avatar" className="mb-2 block text-sm font-semibold text-slate-700">Profile avatar</label>
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <label htmlFor="profile-avatar" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary">
                      <ImagePlus aria-hidden="true" className="h-4 w-4" /> Choose image
                    </label>
                    <input id="profile-avatar" type="file" accept="image/*" onChange={event => event.target.files?.[0] && replaceLocalAvatar(event.target.files[0])} className="sr-only" />
                    <span className="min-w-0 break-words text-xs text-slate-500">{avatarIsLocal ? 'New image selected' : 'JPG, PNG, or another browser-supported image'}</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-phone" className="mb-2 block text-sm font-semibold text-slate-700">Phone number</label>
                  <input id="profile-phone" type="tel" required maxLength={15} value={form.phone} onChange={event => { setForm(current => ({ ...current, phone: event.target.value })); setErrors(current => ({ ...current, phone: undefined })); setSaved(false); }} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'profile-phone-error' : undefined} className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. +254 712 345 678" />
                  {errors.phone && <p id="profile-phone-error" className="mt-2 text-sm text-red-700">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="profile-bio" className="mb-2 block text-sm font-semibold text-slate-700">Bio <span className="font-normal text-slate-500">(optional)</span></label>
                  <textarea id="profile-bio" rows={5} value={form.bio} onChange={event => { setForm(current => ({ ...current, bio: event.target.value })); setSaved(false); }} className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Describe your design style, certifications, and experience." />
                </div>

                <Button type="submit" disabled={saving}>{saving ? 'Saving profile…' : 'Save profile'}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
