import { api } from "@/api/client";

export interface RazorpayPlan {
  id: string;
  name: string;
  amount: number; // in paise
  currency: string;
  period: string;
  description: string;
}

export interface CreateSubscriptionPayload {
  plan_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface SubscriptionOrderResponse {
  subscription_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  key_id: string;
  customer: {
    name?: string;
    email?: string;
    phone?: string;
  };
  created_at: number;
  status: string;
}

export interface VerifyPaymentPayload {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export const razorpayApi = {
  getPlans: async (): Promise<{ plans: RazorpayPlan[] }> => {
    return api.get<{ plans: RazorpayPlan[] }>("/razorpay/plans");
  },

  createSubscription: async (
    payload: CreateSubscriptionPayload
  ): Promise<SubscriptionOrderResponse> => {
    return api.post<SubscriptionOrderResponse>("/razorpay/create-subscription", payload);
  },

  verifyPayment: async (payload: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }) => {
    return api.post<{ status: string; message: string; payment_id: string }>(
      "/razorpay/verify-payment",
      payload
    );
  },
};
