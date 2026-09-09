import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  FileText,
  DollarSign,
  TrendingUp,
  Grid,
  Settings,
  LogOut,
  User,
  ArrowLeft,
} from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getMyPlans,
  getCategories,
  createPlan,
  patchPlan,
  deletePlan,
  submitPlan,
  downloadPlanFile,
  getSellerProfiles,
  updateSellerProfile,
  getOrders,
  getMediaUrl,
} from '@/api';

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('designs'); // 'designs' | 'profile'
  const [user, setUser] = useState(null);
  
  // Plans / designs states
  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  // Profile states
  const [profile, setProfile] = useState({ id: null, phone: '', bio: '', avatar: null });
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

  // Orders / sales states
  const [orders, setOrders] = useState([]);
  
  // Create / Edit modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planFormData, setPlanFormData] = useState({
    title: '',
    category: '',
    description: '',
    price: '',
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [designFile, setDesignFile] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Authentication check
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (!storedUser || !token) {
      navigate('/');
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (parsed.role !== 'seller') {
      navigate('/');
      return;
    }
    setUser(parsed);
  }, [navigate]);

  // Fetch initial data
  useEffect(() => {
    if (!user) return;
    
    getMyPlans()
      .then(setPlans)
      .catch((err) => console.error('Failed to load plans', err))
      .finally(() => setLoadingPlans(false));

    getCategories()
      .then(setCategories)
      .catch((err) => console.error('Failed to load categories', err));

    // Load seller profile
    getSellerProfiles()
      .then((profiles) => {
        if (profiles && profiles.length > 0) {
          const prof = profiles[0];
          setProfile({
            id: prof.id || prof.user, // Django profile pk
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
      .finally(() => setLoadingProfile(false));

    // Load orders
    getOrders()
      .then((data) => setOrders(data))
      .catch((err) => console.error('Failed to load orders', err));
  }, [user]);

  // Compute Stats
  const myPlans = plans;
  // The API exposes only this designer's items, including historical snapshots.
  const completedSales = orders.filter((order) => order.status === 'completed');
  const soldItems = completedSales.flatMap((order) => order.items);
  const unknownSales = soldItems.filter((item) => item.unit_price === null).length;
  const totalEarnings = soldItems.reduce((sum, item) =>
    sum + (item.unit_price === null ? 0 : Number(item.unit_price)), 0);

  // Handle plan delete
  const handleDeletePlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this house plan?')) return;
    try {
      await deletePlan(id);
      setPlans(plans.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete plan', err);
      alert('Failed to delete plan. Please try again.');
    }
  };

  const handleSubmitPlan = async (id) => {
    try {
      const updated = await submitPlan(id);
      setPlans(plans.map((plan) => (plan.id === id ? updated : plan)));
    } catch (err) {
      console.error('Failed to submit plan', err);
      alert(err.message);
    }
  };

  // Open Modal for Create or Edit
  const handleDownloadPlan = async (id) => {
    try {
      const blob = await downloadPlanFile(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plan-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(err.message);
    }
  };

  const openPlanModal = (plan = null) => {
    setModalError(null);
    setThumbnailFile(null);
    setDesignFile(null);
    if (plan) {
      setEditingPlan(plan);
      setPlanFormData({
        title: plan.title || '',
        category: plan.category || '',
        description: plan.description || '',
        price: plan.price ? Math.round(Number(plan.price)).toString() : '',
      });
    } else {
      setEditingPlan(null);
      setPlanFormData({
        title: '',
        category: '',
        description: '',
        price: '',
      });
    }
    setIsModalOpen(true);
  };

  const handlePlanFormChange = (e) => {
    setPlanFormData({
      ...planFormData,
      [e.target.name]: e.target.value,
    });
  };

  // Save Plan (Create/Update)
  const handleSavePlan = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const formData = new FormData();
    formData.append('title', planFormData.title);
    formData.append('category', planFormData.category);
    formData.append('description', planFormData.description);
    formData.append('price', planFormData.price);
    
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }
    if (designFile) {
      formData.append('plan_file', designFile);
    }

    try {
      if (editingPlan) {
        // Update plan (using PATCH or PUT. PATCH is safer with FormData if some files aren't uploaded)
        const updated = await patchPlan(editingPlan.id, formData);
        setPlans(plans.map((p) => (p.id === editingPlan.id ? updated : p)));
      } else {
        // Create plan
        const created = await createPlan(formData);
        setPlans([created, ...plans]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Update Profile Settings
  const handleSaveProfile = async (e) => {
    e.preventDefault();
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
        id: updated.id || updated.user,
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="flex-1 pt-28 pb-16 px-6 max-w-7xl mx-auto w-full">
        {/* Back Link */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>

        {/* Dashboard Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Seller Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage your designs, view sales data, and update your public seller profile.
            </p>
          </div>
          <Button
            onClick={() => openPlanModal()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" /> Add New Design
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="border-0 shadow-lg bg-white overflow-hidden rounded-2xl relative">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Designs Posted
                </p>
                <h3 className="text-3xl font-black text-slate-800 mt-1">{plans.length}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Grid className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white overflow-hidden rounded-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Total Purchases
                </p>
                <h3 className="text-3xl font-black text-slate-800 mt-1">
                  {soldItems.length}
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white overflow-hidden rounded-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Total Revenue
                </p>
                <h3 className="text-3xl font-black text-slate-800 mt-1">
                  Ksh {totalEarnings.toLocaleString()}
                </h3>
                {unknownSales > 0 && <p className="text-sm text-amber-700">Excludes {unknownSales} historical sales with unknown prices.</p>}
              </div>
              <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-slate-200 pb-4 mb-8">
          <button
            onClick={() => setActiveTab('designs')}
            className={`flex items-center gap-2 pb-2 px-4 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'designs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Grid className="w-4 h-4" /> My Designs
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 pb-2 px-4 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Settings className="w-4 h-4" /> Profile Settings
          </button>
        </div>

        {/* Designs Tab */}
        {activeTab === 'designs' && (
          <div>
            {loadingPlans ? (
              <p className="text-slate-400 text-sm">Loading blueprints...</p>
            ) : plans.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-dashed border-slate-200">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-semibold mb-2">No plans posted yet.</p>
                <p className="text-slate-400 text-sm mb-6">
                  Add your first blueprint design to start selling!
                </p>
                <Button
                  onClick={() => openPlanModal()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Post Your First Plan
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="group overflow-hidden rounded-2xl border-0 shadow-lg bg-white flex flex-col"
                  >
                    <div className="relative h-48 overflow-hidden bg-slate-100">
                      <img
                        src={getMediaUrl(plan.thumbnail) || '/images/hero.png'}
                        alt={plan.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <Badge className="bg-primary text-white border-0 rounded-md px-2.5 py-0.5 text-xxs uppercase">
                          {plan.category_group}
                        </Badge>
                      </div>
                      <div className="absolute top-4 right-4 z-10 flex gap-2">
                        {plan.status === 'draft' && (
                          <>
                            <button
                              onClick={() => openPlanModal(plan)}
                              className="bg-white/90 backdrop-blur rounded-full p-2 text-slate-600 hover:text-blue-600 hover:bg-white transition-all shadow-sm"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              className="bg-white/90 backdrop-blur rounded-full p-2 text-slate-600 hover:text-red-600 hover:bg-white transition-all shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-bold text-slate-800 line-clamp-1">
                            {plan.title}
                          </h3>
                          <span className="font-bold text-blue-600 text-md whitespace-nowrap pl-2">
                            Ksh {Number(plan.price).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-3 uppercase tracking-wider">
                          {plan.category_name}
                        </p>
                        <p className="text-sm text-slate-500 line-clamp-3 mb-4">
                          {plan.description || 'No description provided.'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Badge className="bg-slate-100 text-slate-700 border-0 rounded-md px-2.5 py-0.5 text-xxs uppercase">
                          {plan.status.replace('_', ' ')}
                        </Badge>
                        {plan.status === 'draft' && (
                          <Button
                            onClick={() => handleSubmitPlan(plan.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 h-auto"
                          >
                            Submit for review
                          </Button>
                        )}
                      </div>
                      {plan.has_plan_file && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-xl w-fit border border-slate-100">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span>Blueprint Attached</span>
                          <button type="button" onClick={() => handleDownloadPlan(plan.id)} className="text-blue-600 underline">Download PDF</button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Settings Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" /> Public Profile Info
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

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
              {/* Avatar Preview & Upload */}
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                  {profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-300 m-auto absolute inset-0" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                    className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="e.g. +254 712 345 678"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                  Professional Bio
                </label>
                <textarea
                  rows={4}
                  required
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Describe your design style, certifications, and experience..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={profileSaving}
                className="w-fit px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
              >
                {profileSaving ? 'Saving...' : 'Update Settings'}
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* Add / Edit Design Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="text-left">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingPlan ? 'Edit Blueprint Design' : 'Post New House Plan'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter details about the design blueprint and upload the files.
              </p>
            </div>

            {modalError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSavePlan} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                    Design Title
                  </label>
                  <input
                    type="text"
                    required
                    name="title"
                    value={planFormData.title}
                    onChange={handlePlanFormChange}
                    placeholder="e.g. Modern 4 Bedroom Villa"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                    Category
                  </label>
                  <select
                    required
                    name="category"
                    value={planFormData.category}
                    onChange={handlePlanFormChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.group})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Price */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                    Price (Ksh)
                  </label>
                  <input
                    type="number"
                    required
                    name="price"
                    value={planFormData.price}
                    onChange={handlePlanFormChange}
                    placeholder="e.g. 85000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  name="description"
                  value={planFormData.description}
                  onChange={handlePlanFormChange}
                  placeholder="Detail parameters like bedrooms, bathrooms, sqft size, style details..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Thumbnail Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                  Design Thumbnail Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) setThumbnailFile(e.target.files[0]);
                  }}
                  className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {/* Blueprint file Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                  Plan File (PDF, up to 20 MB)
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    if (e.target.files) setDesignFile(e.target.files[0]);
                  }}
                  className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="flex gap-4 justify-end mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={modalLoading}
                  className="px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {modalLoading ? 'Saving...' : 'Save Design'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
