import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signInAnonymously,
} from 'firebase/auth';
import { doc, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { SparkleIcon } from './icons/SparkleIcon';
import { UserIcon, X, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Pricing from './Pricing';
import Checkout from './Checkout';
import { PRICING_PLANS } from '../constants';

interface SignInProps {
  onStart: () => void;
  initialIsSignUp?: boolean;
  onBack: () => void;
  isModal?: boolean;
}

declare global {
  interface Window {
    grecaptcha: any;
  }
}

type SignUpStep = 'info' | 'pricing' | 'checkout' | 'success';

const SignIn: React.FC<SignInProps> = ({ onStart, initialIsSignUp = false, onBack, isModal = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('info');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const executeFirebaseAuth = async () => {
    console.log(`Starting Email ${isSignUp ? 'Sign Up' : 'Sign In'}...`);
    try {
      if (isSignUp) {
        if (!username.trim()) {
          setError('Username is required');
          setIsLoading(false);
          return;
        }
        // Move to pricing if signing up
        setIsLoading(false);
        setSignUpStep('pricing');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Email Sign In success');
      }
    } catch (err: any) {
      console.error('Email Auth error:', err);
      let message = err.message;
      if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already in use. Try signing in instead.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Invalid email or password.';
      }
      setError(message);
      setIsLoading(false);
    }
  };

  const finalizeSignUp = async (orderData?: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const plan = PRICING_PLANS.find(p => p.id === selectedPlanId) || PRICING_PLANS[0];

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        username: username,
        displayName: username,
        photoURL: user.photoURL || '',
        role: 'user',
        subscription: plan.id,
        billingCycle: billingCycle,
        creditsRemaining: plan.credits,
        createdAt: new Date().toISOString(),
        lastPayment: orderData ? orderData.id : null
      });

      setSignUpStep('success');
    } catch (err: any) {
      console.error('Finalize sign up error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (planId: string, cycle: 'monthly' | 'yearly') => {
    setSelectedPlanId(planId);
    setBillingCycle(cycle);
    const plan = PRICING_PLANS.find(p => p.id === planId);
    const price = plan ? (cycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice) : 0;
    
    if (price > 0) {
      setSignUpStep('checkout');
    } else {
      finalizeSignUp();
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setIsLoading(true);
    console.log('Starting Google Auth...');
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      console.log('Google Auth success:', user.email);
      
      const userDoc = await getDocFromServer(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          username: user.email?.split('@')[0] || 'Member',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          role: 'user',
          subscription: 'free',
          creditsRemaining: 10,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Popup blocked or closed. In this preview environment, Google Sign-In requires opening the app in a new tab.');
      } else {
        setError(err.message || 'An unexpected error occurred during Google sign-in.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setIsLoading(true);
    console.log('Starting Guest Login...');
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: null,
        username: 'Guest',
        displayName: 'Guest Artist',
        photoURL: '',
        role: 'guest',
        subscription: 'free',
        creditsRemaining: 10,
        createdAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Guest Login error:', err);
      setError(err.message || 'An unexpected error occurred during guest login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (window.grecaptcha && window.grecaptcha.enterprise) {
        window.grecaptcha.enterprise.ready(async () => {
          try {
            const token = await window.grecaptcha.enterprise.execute('6LcSAMAsAAAAALe5dbJss12J4SfUW-RbITu-CT4F', {action: 'LOGIN'});
            
            const verifyRes = await fetch('/api/verify-recaptcha', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
            }).catch(err => {
              console.warn("Backend verification endpoint unreachable, likely a static export. Proceeding...", err);
              return { ok: true, json: async () => ({ success: true }) } as any;
            });

            if (!verifyRes.ok) {
              if (verifyRes.status === 404) {
                 console.warn("reCAPTCHA endpoint not found (404), likely a static export. Proceeding...");
                 await executeFirebaseAuth();
                 return;
              }
              throw new Error("Failed to verify reCAPTCHA on the server.");
            }
            const verifyData = await verifyRes.json();
            if(!verifyData.success) {
                throw new Error(verifyData.error || "reCAPTCHA verification failed.");
            }
            
            await executeFirebaseAuth();
          } catch (recaptchaErr: any) {
            console.error('reCAPTCHA error:', recaptchaErr);
            setError('reCAPTCHA verification failed: ' + recaptchaErr.message);
            setIsLoading(false);
          }
        });
      } else {
        console.warn('reCAPTCHA not loaded, proceeding without it');
        await executeFirebaseAuth();
      }
    } catch (err: any) {
      console.error('Unexpected error during auth flow:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (isSignUp && signUpStep === 'pricing') {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0f102e] overflow-y-auto overflow-x-hidden pt-20">
        <Pricing 
          onSelectPlan={handlePlanSelect} 
          onBack={() => setSignUpStep('info')} 
        />
      </div>
    );
  }

  if (isSignUp && signUpStep === 'checkout' && selectedPlanId) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0f102e] flex flex-col items-center justify-center p-4">
        <Checkout 
          planId={selectedPlanId} 
          billingCycle={billingCycle}
          onSuccess={(order) => finalizeSignUp(order)} 
          onCancel={() => setSignUpStep('pricing')} 
        />
      </div>
    );
  }

  if (isSignUp && signUpStep === 'success') {
    return (
      <div className="fixed inset-0 z-[70] bg-[#0f102e] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-[#111] rounded-3xl border border-white/10 p-10 shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
               <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Welcome aboard!</h2>
          <p className="text-gray-400 mb-8">Your Lyrically account has been created successfully. Your creative credits are ready to use.</p>
          <button 
            onClick={onStart}
            className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-light transition-all shadow-lg shadow-accent/20"
          >
            Start Making Music
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={isModal ? "relative flex items-center justify-center p-4 w-full" : "min-h-screen bg-[#1a1c4a] text-white overflow-x-hidden font-sans relative selection:bg-accent selection:text-white flex items-center justify-center p-4"}>
      {/* Immersive Atmospheric Background */}
      {!isModal && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-main/30 blur-[120px]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-accent/20 blur-[150px]"></div>
          <div className="absolute top-[40%] left-[60%] w-[40vw] h-[40vw] rounded-full bg-[#39FF14]/5 blur-[120px]"></div>
        </div>
      )}

      <div className="w-full max-w-md relative overflow-hidden rounded-2xl bg-[#111] p-8 md:p-10 border border-white/10 shadow-2xl z-10 mx-auto">
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
        >
          {isModal ? <X className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>
        
        <div className="text-center mb-8 pt-4">
          <div className="flex items-center justify-center mb-6">
            <img src="/Lyrically_Logo+Wordmark_T.png" alt="Lyrically Wordmark" className="h-9 object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-gray-400">
            {isSignUp ? 'First, let\'s set up your account details.' : 'Pick up where you left off.'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              required={isSignUp}
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            required
          />
          
          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-left">
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-3.5 bg-accent text-white rounded-xl font-bold transition-all hover:bg-accent-light active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Processing...' : (isSignUp ? 'Continue to Plans' : 'Sign In')}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <span className="relative px-4 bg-[#111] text-xs text-gray-500 font-medium uppercase tracking-wider">Or</span>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full p-3.5 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:bg-gray-200 active:scale-[0.98] disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
          <button
            onClick={handleGuestLogin}
            disabled={isLoading}
            className="w-full p-3.5 bg-transparent border border-white/20 text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-all hover:bg-white/5 active:scale-[0.98] disabled:opacity-50"
          >
            <UserIcon className="w-5 h-5" />
            Try as Guest
          </button>
        </div>

        <p className="mt-8 text-center text-gray-400 text-sm">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-white font-bold hover:text-accent transition-colors underline decoration-white/30 underline-offset-4"
          >
            {isSignUp ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignIn;

