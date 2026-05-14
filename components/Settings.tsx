import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, ArrowLeft, Save, CreditCard, Sparkles } from 'lucide-react';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { LyricallyUser } from '../types';

interface SettingsProps {
  onBack: () => void;
  onGoToPricing?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack, onGoToPricing }) => {
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [userData, setUserData] = useState<LyricallyUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as LyricallyUser);
      }
    };
    fetchUserData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSaving(true);
    setSaveMessage('');
    try {
      await updateProfile(auth.currentUser, { displayName });
      // Update firestore if possible
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: displayName
      }).catch(err => console.warn('Could not update firestore metadata', err));
      
      setSaveMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-main text-white p-6">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Projects
        </button>

        <div className="flex items-center gap-4 mb-8">
            <img src="/Lyrically_Logo+Wordmark_T.png" alt="Lyrically Logo" className="h-9 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
            <div className="w-px h-8 bg-white/10 mx-2" />
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent-light">
              Settings
            </h1>
        </div>

        <div className="flex flex-col gap-8">
          {/* Subscription Section */}
          <div className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 border border-pink-500/30 rounded-3xl p-8 backdrop-blur-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-pink-500" />
                  <h2 className="text-2xl font-bold">Your Subscription</h2>
                </div>
                <p className="text-gray-300">
                  You are currently on the <span className="text-white font-bold uppercase tracking-wider">{userData?.subscription || 'Free'}</span> plan.
                </p>
                <div className="flex items-center gap-4 mt-4">
                   <div className="flex flex-col">
                      <span className="text-xs text-gray-400 uppercase font-bold tracking-tighter">Credits Remaining</span>
                      <span className="text-2xl font-black text-white">{userData?.creditsRemaining ?? '--'}</span>
                   </div>
                </div>
              </div>
              <button 
                onClick={onGoToPricing}
                className="px-6 py-3 bg-white text-pink-600 border border-white hover:bg-pink-50 rounded-xl font-bold transition-all shadow-xl"
              >
                Upgrade Plan
              </button>
            </div>
          </div>

          {/* Profile Area */}
          <div className="flex-grow bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">User Profile</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={auth.currentUser?.email || ''}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500 italic">Email cannot be changed.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-light disabled:bg-accent/50 rounded-xl font-bold transition-all shadow-lg shadow-accent/20"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                {saveMessage && (
                  <p className={`text-sm ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                    {saveMessage}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
