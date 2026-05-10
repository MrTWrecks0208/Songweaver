import React, { useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { getDocFromServer, doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import SignIn from './components/SignIn';
import Landing from './components/Landing';
import Workspace from './components/Workspace';
import ProjectList from './components/ProjectList';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Pricing from './components/Pricing';

type View = 'landing' | 'signin' | 'projects' | 'workspace' | 'settings' | 'pricing';

function App() {
  const [view, setView] = useState<View>('landing');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectOwnerId, setCurrentProjectOwnerId] = useState<string | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    async function testConnection() {
      const attempt = async (retries = 0) => {
        try {
          // Use a simple task that exists or is likely to be permitted
          await getDocFromServer(doc(db, 'system', 'connection_test'));
          console.log("Firestore connection established.");
        } catch (error: any) {
          if (retries < 2) {
            setTimeout(() => attempt(retries + 1), 3000);
          } else {
            console.warn("Firestore is running in offline/limited mode:", error.message);
          }
        }
      };
      attempt();
    }
    testConnection();

    const params = new URLSearchParams(window.location.search);
    const sharedParam = params.get('shared');

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
      if (user) {
        if (sharedParam) {
           const [oId, pId] = sharedParam.split('_');
           if (oId && pId) {
             setCurrentProjectOwnerId(oId);
             setCurrentProjectId(pId);
             setView('workspace');
             window.history.replaceState({}, document.title, "/");
           } else {
             setView('projects');
           }
        } else if (view === 'landing' || view === 'signin') {
           setView('projects');
        }
      } else {
        setView('landing');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleStart = useCallback(() => {
    if (user) {
      setView('projects');
    } else {
      setView('landing');
    }
  }, [user]);

  const handleGoToSignIn = useCallback((signUp = false) => {
    setIsSignUp(signUp);
    setView('signin');
  }, []);

  const handleGuestLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: null,
        displayName: 'Guest Artist',
        photoURL: '',
        role: 'guest',
        createdAt: new Date().toISOString(),
        credits: 50
      });
    } catch (err: any) {
      console.error('Guest Login error:', err);
      setIsLoading(false);
    }
  }, []);
  
  const handleSelectProject = useCallback((projectId: string) => {
    setCurrentProjectId(projectId);
    setCurrentProjectOwnerId(null);
    setView('workspace');
  }, []);

  const handleBackToProjects = useCallback(() => {
    setCurrentProjectId(null);
    setCurrentProjectOwnerId(null);
    setView('projects');
  }, []);

  const handleGoToSettings = useCallback(() => {
    setView('settings');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-main">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-main overflow-hidden text-white">
      {user && view !== 'landing' && view !== 'signin' && (
        <div className="hidden md:block">
          <Sidebar currentView={view} setView={(v) => {
            if (v === 'pricing' && view === 'workspace') {
              setShowPricingModal(true);
              return;
            }
            if (v === 'projects') {
               setCurrentProjectId(null);
               setCurrentProjectOwnerId(null);
            }
            setView(v as View);
          }} user={user} />
        </div>
      )}
      <div className="flex-1 overflow-auto bg-main relative">
        {(view === 'landing' || view === 'signin') && !user && (
          <div className="relative min-h-screen w-full">
             <Landing 
               onSignInClick={() => handleGoToSignIn(false)}
               onSignUpClick={() => handleGoToSignIn(true)}
               onGuestClick={handleGuestLogin}
             />
             {view === 'signin' && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                 <SignIn 
                   onStart={handleStart} 
                   initialIsSignUp={isSignUp}
                   onBack={() => setView('landing')}
                   isModal={true}
                 />
               </div>
             )}
          </div>
        )}
        {view === 'projects' && user && (
          <ProjectList onSelectProject={handleSelectProject} onGoToSettings={handleGoToSettings} />
        )}
        {view === 'settings' && user && <Settings onBack={handleBackToProjects} onGoToPricing={() => setView('pricing')} />}
        {view === 'pricing' && user && (
          <Pricing 
            onSelectPlan={(planId, cycle) => {
              // For existing users, handle upgrade
              console.log('Upgrading plan for existing user:', planId, cycle);
              setView('projects');
            }} 
            onBack={() => setView('projects')} 
          />
        )}
        {view === 'workspace' && currentProjectId && user && (
           <>
             <Workspace projectId={currentProjectId} ownerId={currentProjectOwnerId || user.uid} onBack={handleBackToProjects} />
             <AnimatePresence>
               {showPricingModal && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-auto">
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setShowPricingModal(false)}
                     className="absolute inset-0 bg-black/80 backdrop-blur-md"
                   />
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95, y: 20 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95, y: 20 }}
                     className="relative w-full max-w-7xl bg-main rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden z-10"
                   >
                      <button 
                        onClick={() => setShowPricingModal(false)}
                        className="absolute top-6 right-8 text-gray-400 hover:text-white transition-colors z-50 text-3xl"
                      >
                        &times;
                      </button>
                      <div className="max-h-[90vh] overflow-y-auto">
                        <Pricing onBack={() => setShowPricingModal(false)} isModal={true} />
                      </div>
                   </motion.div>
                 </div>
               )}
             </AnimatePresence>
           </>
        )}
      </div>
    </div>
  );
}

export default App;
