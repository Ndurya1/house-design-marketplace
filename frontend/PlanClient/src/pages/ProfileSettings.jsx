import React from "react";
import { useState, useEffect } from "react";
import { Settings, User, Grid} from 'lucide-react'
import { getSellerProfiles, getMediaUrl, updateSellerProfile } from "@/api";
import { Button } from "@/components/ui/button";

export default function ProfileSettings() {

    const [activeTab, setActiveTab] = useState('profile-edit');

    const [profile, setProfile] = useState({ id: null, phone: '', bio: '', avatar: null });
    const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

    useEffect(() => {
      let cancelled = false;
    // Load seller profile
        getSellerProfiles()
          .then((profiles) => {
            if (!cancelled && profiles && profiles.length > 0) {
              const prof = profiles[0];
              setProfile({
                id: prof.id, 
                phone: prof.phone || '',
                bio: prof.bio || '',
                avatar: null, // file will be set on upload
              });
              if (prof.avatar) {
                setProfileAvatarUrl(getMediaUrl(prof.avatar));
              }
            }
          })
          .catch((err) => console.error('Failed to load seller profile', err))
          .finally(() => { if (!cancelled) setLoadingProfile(false); });
      return () => { cancelled = true; };
    }, []);

        // Update Profile Settings
          const handleSaveProfile = async (e) => {
            e.preventDefault();
            if (!profile.id) return;
            setProfileSaving(true);
            setProfileMsg({ text: '', type: '' });
        
            const formData = new FormData();
            formData.append('phone', profile.phone);
            formData.append('bio', profile.bio);
            if (profile.avatar) {
              formData.append('avatar', profile.avatar);
            }
        
            try {
              const updated = await updateSellerProfile(profile.id, formData);
              setProfile({
                id: updated.id,
                phone: updated.phone || '',
                bio: updated.bio || '',
                avatar: null,
              });
              if (updated.avatar) {
                setProfileAvatarUrl(getMediaUrl(updated.avatar));
              }
              setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
            } catch (err) {
              console.error(err);
              setProfileMsg({ text: 'Failed to update profile details.', type: 'error' });
            } finally {
              setProfileSaving(false);
            }
          };  

          return(
            <div className=" flex flex-col items-center justify-center min-w-0 w-full px-4 py-6 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">Profile Settings</h2>
                 <div className="flex flex-wrap gap-2 pb-4 mb-8">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-2 pb-2 px-4 font-semibold text-sm transition-all border-b-2 ${activeTab === 'profile'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Grid className="w-4 h-4" /> Profile
                    </button>

                    <button
                        onClick={() => setActiveTab('profile-edit')}
                        className={`flex items-center gap-2 pb-2 px-4 font-semibold text-sm transition-all border-b-2 ${
                        activeTab === 'profile-edit'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Settings className="w-4 h-4" /> Profile Settings
                    </button>
        </div>

        {activeTab === 'profile' && (
            <div className="flex flex-col justify-center items-center p-2 rounded-md  "> 
                <h2 className=" text-xl font-bold ">Profile</h2>
               {profile ? (
               <div>
                <p>{profile.id}</p>
                <p>{profile.phone}</p>
                <p>{profile.user}</p>

              </div>
                
               ): (
                <p> loading profile...</p>
               )}
                
            </div>
        )}

         {/* Profile Settings Tab */}
        {activeTab === 'profile-edit' && (
          <div className=" w-full max-w-xl items-center  bg-white rounded-xl  border border-slate-100 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" /> Edit Profile 
            </h2>

            {profileMsg.text && (
              <div
                className={`p-4 rounded-xl text-sm font-semibold mb-6 border ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-6 w-full m-auto ">
              {/* Avatar Preview & Upload */}
              <div className="flex min-w-0 flex-col sm:flex-row items-start gap-4 ">
                <div className="relative w-20 h-20 m-auto rounded-full overflow-hidden  border border-slate-200 flex-shrink-0">

                  {profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-primary m-auto absolute inset-0" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                    Profile Avatar
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setProfile({ ...profile, avatar: e.target.files[0] });
                        setProfileAvatarUrl(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                    className="w-full min-w-0 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-800 file:text-white hover:file:bg-white hover:file:text-blue-800 cursor-pointer hover:file:border-blue-800 hover:file:border"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="flex min-w-0 flex-col gap-1.5 ">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                   Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="e.g. +254 712 345 678"
                  className="w-full min-w-0 px-3 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all text-xs "
                />
              </div>

              {/* Bio */}
              <div className="flex min-w-0 flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                   Bio <p className="text-xs lowercase text-slate-400">(tell us more about yourself)</p>
                </label>
                <textarea
                  rows={4}
                  required
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Describe your design style, certifications, and experience..."
                  className="w-full min-w-0 px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all resize-none text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={profileSaving || loadingProfile || !profile.id}
                className="w-fit px-8 py-3  bg-blue-600 hover:bg-white hover:ring-2 hover:ring-blue-800 hover:text-blue-800 text-white font-semibold rounded-xl transition-all"
              >
                {profileSaving ? 'Saving...' : 'Update Settings'}
              </Button>
            </form>
          </div>
        )}

            </div>
          )
}




