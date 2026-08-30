import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RazorpaySubscriptionModal } from "../RazorpaySubscriptionModal";
import { razorpayApi } from "@/api/modules/razorpay";

vi.mock("@/api/modules/razorpay", () => ({
  razorpayApi: {
    createSubscription: vi.fn(),
    verifyPayment: vi.fn(),
  },
}));

describe("RazorpaySubscriptionModal Component (#969)", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isOpen = true) =>
    render(
      <RazorpaySubscriptionModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

  it("renders Razorpay subscription modal with Pro and Teams plans", () => {
    renderModal();

    expect(screen.getByText("DevLink Pro (India / Razorpay)")).toBeInTheDocument();
    expect(screen.getByText(/pay securely with upi, rupay\/cards & net banking/i)).toBeInTheDocument();

    expect(screen.getAllByText("DevLink Pro (Monthly)")[0]).toBeInTheDocument();
    expect(screen.getByText("DevLink Pro (Annual)")).toBeInTheDocument();
    expect(screen.getByText("DevLink Teams (Monthly)")).toBeInTheDocument();
  });

  it("switches payment method tabs between UPI, Cards, and Net Banking", () => {
    renderModal();

    // Default UPI tab
    expect(screen.getByText(/upi \(gpay\/phonepe\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/enter vpa \/ upi id \(google pay, phonepe, paytm, bhim\)/i)
    ).toBeInTheDocument();

    // Click Cards tab
    const cardsTab = screen.getByRole("button", { name: /rupay \/ cards/i });
    fireEvent.click(cardsTab);
    expect(screen.getByText("Card Number")).toBeInTheDocument();
    expect(screen.getByText("Expiry (MM/YY)")).toBeInTheDocument();

    // Click Net Banking tab
    const netbankingTab = screen.getByRole("button", { name: /net banking/i });
    fireEvent.click(netbankingTab);
    expect(screen.getByText("Select Bank")).toBeInTheDocument();
    expect(screen.getByText("State Bank of India (SBI)")).toBeInTheDocument();
  });

  it("calculates subtotal, 18% GST, and total payable in INR", () => {
    renderModal();

    // Pro Monthly default: ₹999 + 18% GST (₹180) = ₹1,179
    expect(screen.getByText("GST (18%)")).toBeInTheDocument();
    expect(screen.getByText("Total Payable")).toBeInTheDocument();
    expect(screen.getByText("₹1,179")).toBeInTheDocument();

    // Switch to Pro Annual (₹9,999 + ₹1,800 = ₹11,799)
    const annualPlanBtn = screen.getByText("DevLink Pro (Annual)");
    fireEvent.click(annualPlanBtn);
    expect(screen.getByText("₹11,799")).toBeInTheDocument();
  });

  it("creates subscription and verifies payment signature on checkout submit", async () => {
    vi.mocked(razorpayApi.createSubscription).mockResolvedValueOnce({
      subscription_id: "sub_rzp_test123",
      plan_id: "plan_pro_monthly",
      plan_name: "DevLink Pro (Monthly)",
      amount: 99900,
      currency: "INR",
      key_id: "rzp_test_devlink2026",
      customer: {},
      created_at: Date.now(),
      status: "created",
    });

    vi.mocked(razorpayApi.verifyPayment).mockResolvedValueOnce({
      status: "verified",
      message: "Razorpay payment verified",
      payment_id: "pay_rzp_123",
    });

    renderModal();

    const submitBtn = screen.getByRole("button", { name: /pay ₹1,179 & subscribe/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(razorpayApi.createSubscription).toHaveBeenCalledWith({
        plan_id: "plan_pro_monthly",
        customer_name: "Indian Developer",
        customer_email: "dev@devlink.in",
      });
    });

    await waitFor(() => {
      expect(razorpayApi.verifyPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          razorpay_subscription_id: "sub_rzp_test123",
        })
      );
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});
