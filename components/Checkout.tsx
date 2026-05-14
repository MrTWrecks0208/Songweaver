import React, { useState } from 'react';
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { PRICING_PLANS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CheckoutProps {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  onSuccess: (orderData: any) => void;
  onCancel: () => void;
}

const CheckoutUI: React.FC<CheckoutProps & { isScriptLoaded: boolean }> = ({ planId, billingCycle, onSuccess, onCancel, isScriptLoaded }) => {
  const plan = PRICING_PLANS.find(p => p.id === planId);
  const [error, setError] = useState<string | null>(null);

  if (!plan) return <div>Invalid plan selected.</div>;
  const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

  return (
    <div className="w-full max-w-md mx-auto bg-[#111] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="p-8 border-b border-white/5 bg-white/5">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group text-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Plans
        </button>
        <h2 className="text-2xl font-bold text-white mb-1">Completing Purchase</h2>
        <p className="text-gray-400 text-sm">Secure checkout via PayPal</p>
      </div>

      <div className="p-8 space-y-6">
        <div className="bg-white/5 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-pink-500 uppercase tracking-widest mb-1">{plan.name} Plan</p>
            <p className="text-white font-medium">{plan.credits} Credits • {billingCycle}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white">${price}</p>
          </div>
        </div>

        {!isScriptLoaded ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            <p className="text-gray-400 text-sm">Loading PayPal Securely...</p>
          </div>
        ) : (
          <div className="min-h-[150px]">
             {error && (
               <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-200 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
               </div>
             )}
             <PayPalButtons 
                style={{ 
                  layout: "vertical", 
                  color: "blue", 
                  shape: "rect", 
                  label: "checkout" 
                }}
                createOrder={(data, actions) => {
                  return actions.order.create({
                    intent: 'CAPTURE',
                    purchase_units: [{
                      amount: {
                        currency_code: "USD",
                        value: price.toString(),
                      },
                      description: `Lyrically ${plan.name} Subscription (${billingCycle}) - ${plan.credits} Credits`
                    }],
                  });
                }}
                onApprove={async (data, actions) => {
                  if (actions.order) {
                    const order = await actions.order.capture();
                    onSuccess(order);
                  }
                }}
                onError={(err) => {
                  console.error("PayPal Error:", err);
                  setError("Something went wrong with the payment. Please try again.");
                }}
                onCancel={() => {
                  setError("Payment was cancelled.");
                }}
              />
          </div>
        )}
      </div>

      <div className="px-8 pb-8 text-center">
         <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            PCI Compliant • Secured by PayPal
         </p>
      </div>
    </div>
  );
};

const PayPalWrapper: React.FC<CheckoutProps> = (props) => {
  const [{ isPending }] = usePayPalScriptReducer();
  
  return <CheckoutUI {...props} isScriptLoaded={!isPending} />;
};

const Checkout: React.FC<CheckoutProps> = (props) => {
  return (
    <PayPalScriptProvider options={{ 
      clientId: "test", // In real app, replace with real Client ID. "test" works for sandbox/mocking in dev.
      currency: "USD",
      intent: "capture"
    }}>
      <PayPalWrapper {...props} />
    </PayPalScriptProvider>
  );
};

export default Checkout;
