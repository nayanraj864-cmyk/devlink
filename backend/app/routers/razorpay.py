import hmac
import hashlib
import time
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header, Request, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/razorpay", tags=["razorpay"])

# Mock/Config Secret Key for Razorpay Verification
RAZORPAY_KEY_ID = "rzp_test_devlink2026"
RAZORPAY_KEY_SECRET = "devlink_razorpay_secret_key_2026"

# Supported Subscription Plans (INR)
PLANS = {
  "plan_pro_monthly": {
    "id": "plan_pro_monthly",
    "name": "DevLink Pro (Monthly)",
    "amount": 99900,  # in paise (₹999.00)
    "currency": "INR",
    "period": "monthly",
    "description": "Pro builder features, priority AI matching, unlimited projects"
  },
  "plan_pro_yearly": {
    "id": "plan_pro_yearly",
    "name": "DevLink Pro (Annual)",
    "amount": 999900,  # in paise (₹9,999.00)
    "currency": "INR",
    "period": "yearly",
    "description": "Pro annual subscription (Save 16%)"
  },
  "plan_teams_monthly": {
    "id": "plan_teams_monthly",
    "name": "DevLink Teams (Monthly)",
    "amount": 249900,  # in paise (₹2,499.00)
    "currency": "INR",
    "period": "monthly",
    "description": "Team collaboration, organization workspaces, priority support"
  }
}

class CreateSubscriptionRequest(BaseModel):
    plan_id: str = Field(..., example="plan_pro_monthly")
    customer_name: Optional[str] = "Developer"
    customer_email: Optional[str] = "developer@devlink.io"
    customer_phone: Optional[str] = "+919876543210"

class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str = Field(..., example="pay_K123456789")
    razorpay_subscription_id: str = Field(..., example="sub_K987654321")
    razorpay_signature: str = Field(..., example="b1c2d3e4f5...")

def verify_razorpay_signature(payment_id: str, subscription_id: str, signature: str, secret: str = RAZORPAY_KEY_SECRET) -> bool:
    """Verifies HMAC SHA256 signature for Razorpay payments."""
    msg = f"{payment_id}|{subscription_id}".encode("utf-8")
    generated_signature = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated_signature, signature)

@router.get("/plans")
def get_plans():
    """List available Razorpay subscription plans in INR."""
    return {"plans": list(PLANS.values())}

@router.post("/create-subscription")
def create_subscription(req: CreateSubscriptionRequest):
    """Creates a new Razorpay subscription order for Indian developers."""
    if req.plan_id not in PLANS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid plan ID. Available plans: {list(PLANS.keys())}"
        )
    
    plan = PLANS[req.plan_id]
    sub_id = f"sub_rzp_{int(time.time())}"
    
    return {
        "subscription_id": sub_id,
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "amount": plan["amount"],
        "currency": plan["currency"],
        "key_id": RAZORPAY_KEY_ID,
        "customer": {
            "name": req.customer_name,
            "email": req.customer_email,
            "phone": req.customer_phone,
        },
        "created_at": int(time.time()),
        "status": "created",
    }

@router.post("/verify-payment")
def verify_payment(req: VerifyPaymentRequest):
    """Verifies Razorpay payment signature after successful checkout."""
    is_valid = verify_razorpay_signature(
        payment_id=req.razorpay_payment_id,
        subscription_id=req.razorpay_subscription_id,
        signature=req.razorpay_signature,
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed: Invalid Razorpay HMAC signature"
        )

    return {
        "status": "verified",
        "message": "Razorpay subscription payment verified successfully!",
        "payment_id": req.razorpay_payment_id,
        "subscription_id": req.razorpay_subscription_id,
        "verified_at": int(time.time()),
    }

@router.post("/webhook")
async def razorpay_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(None)):
    """Handles incoming Razorpay subscription webhooks (UPI, Cards, Net Banking)."""
    payload_bytes = await request.body()
    
    # Optional webhook signature verification
    if x_razorpay_signature:
        generated_sig = hmac.new(
            RAZORPAY_KEY_SECRET.encode("utf-8"), payload_bytes, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(generated_sig, x_razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid Webhook Signature")

    try:
        data = await request.json()
    except Exception:
        data = {}

    event = data.get("event", "payment.captured")
    
    return {
        "status": "processed",
        "event": event,
        "received_at": int(time.time()),
    }
