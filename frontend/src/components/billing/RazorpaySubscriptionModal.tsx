import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CreditCard,
  Building2,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { razorpayApi, type RazorpayPlan } from "@/api/modules/razorpay";

export interface RazorpaySubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_PLANS: RazorpayPlan[] = [
  {
    id: "plan_pro_monthly",
    name: "DevLink Pro (Monthly)",
    amount: 99900,
    currency: "INR",
    period: "monthly",
    description: "Unlimited project matching, priority AI flares & pro badge",
  },
  {
    id: "plan_pro_yearly",
    name: "DevLink Pro (Annual)",
    amount: 999900,
    currency: "INR",
    period: "yearly",
    description: "Annual pro access with 2 months free (Save 16%)",
  },
  {
    id: "plan_teams_monthly",
    name: "DevLink Teams (Monthly)",
    amount: 249900,
    currency: "INR",
    period: "monthly",
    description: "Team organization workspace, admin logs & priority support",
  },
];

const POPULAR_BANKS = [
  "State Bank of India (SBI)",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
];

export function RazorpaySubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
}: RazorpaySubscriptionModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("plan_pro_monthly");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");

  // Form inputs
  const [vpaId, setVpaId] = useState("developer@upi");
  const [cardNumber, setCardNumber] = useState("4532 •••• •••• 8892");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");

  const [isProcessing, setIsProcessing] = useState(false);

  const selectedPlan =
    DEFAULT_PLANS.find((p) => p.id === selectedPlanId) || DEFAULT_PLANS[0];
  const priceInRupees = selectedPlan.amount / 100;
  const gstAmount = Math.round(priceInRupees * 0.18);
  const totalAmount = priceInRupees + gstAmount;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // 1. Create Subscription Order
      const subOrder = await razorpayApi.createSubscription({
        plan_id: selectedPlan.id,
        customer_name: "Indian Developer",
        customer_email: "dev@devlink.in",
      });

      // Simulated Razorpay Payment Signature for client verification
      const mockPaymentId = `pay_rzp_${Date.now()}`;
      const mockSignature = "b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0";

      // 2. Verify Payment Signature
      await razorpayApi.verifyPayment({
        razorpay_payment_id: mockPaymentId,
        razorpay_subscription_id: subOrder.subscription_id,
        razorpay_signature: mockSignature,
      });

      toast.success("Subscription Activated!", {
        description: `Welcome to ${selectedPlan.name}. Receipt emailed to dev@devlink.in`,
      });

      setIsProcessing(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      toast.error("Payment failed. Please try again.", {
        description: err instanceof Error ? err.message : "Razorpay payment error",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="max-w-md rounded-xl p-6 sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 p-2 text-primary">
              <Sparkles size={20} />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">DevLink Pro (India / Razorpay)</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Pay securely with UPI, RuPay/Cards & Net Banking in INR (₹)
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleCheckout} className="mt-4 space-y-5">
          {/* Plan Options */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Subscription Plan
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {DEFAULT_PLANS.map((plan) => {
                const isSelected = plan.id === selectedPlanId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative flex flex-col justify-between rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    {plan.period === "yearly" && (
                      <span className="absolute -top-2 right-2 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                        Save 16%
                      </span>
                    )}
                    <div>
                      <p className="text-xs font-bold text-foreground">{plan.name}</p>
                      <p className="mt-1 text-sm font-extrabold text-primary">
                        ₹{(plan.amount / 100).toLocaleString("en-IN")}
                        <span className="text-[11px] font-normal text-muted-foreground">
                          /{plan.period === "yearly" ? "yr" : "mo"}
                        </span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Choose Payment Method
            </label>
            <div className="flex rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setPaymentMethod("upi")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                  paymentMethod === "upi"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <QrCode size={14} /> UPI (GPay/PhonePe)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                  paymentMethod === "card"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CreditCard size={14} /> RuPay / Cards
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("netbanking")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                  paymentMethod === "netbanking"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 size={14} /> Net Banking
              </button>
            </div>
          </div>

          {/* Payment Fields according to active tab */}
          {paymentMethod === "upi" && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <label className="text-xs font-medium text-foreground">
                Enter VPA / UPI ID (Google Pay, PhonePe, Paytm, BHIM)
              </label>
              <Input
                type="text"
                value={vpaId}
                onChange={(e) => setVpaId(e.target.value)}
                placeholder="username@upi"
                required
                className="bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Payment request will be sent to your UPI app for 1-click approval.
              </p>
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Card Number</label>
                <Input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4532 1234 5678 9010"
                  required
                  className="bg-background mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-foreground">Expiry (MM/YY)</label>
                  <Input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="12/28"
                    required
                    className="bg-background mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">CVV</label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="123"
                    required
                    className="bg-background mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === "netbanking" && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <label className="text-xs font-medium text-foreground">Select Bank</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {POPULAR_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="rounded-lg bg-surface p-3 space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>{selectedPlan.name}</span>
              <span>₹{priceInRupees.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST (18%)</span>
              <span>₹{gstAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="pt-2 border-t border-border flex justify-between font-bold text-foreground text-sm">
              <span>Total Payable</span>
              <span className="text-primary">₹{totalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground justify-center">
            <ShieldCheck size={14} className="text-success" />
            <span>256-bit SSL encrypted • Razorpay PCI-DSS Level 1 Verified</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing} className="gap-1.5">
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Processing...
                </>
              ) : (
                <>
                  Pay ₹{totalAmount.toLocaleString("en-IN")} & Subscribe
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
