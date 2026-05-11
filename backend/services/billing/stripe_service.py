import os
import stripe
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


def create_checkout_session(
    org_id: str,
    plan_id: str,
    success_url: str,
    cancel_url: str
) -> Dict[str, Any]:
    """Create Stripe checkout session for subscription upgrade."""
    from models.plan import Plan
    from database import SessionLocal

    db = SessionLocal()
    try:
        plan = db.query(Plan).filter(Plan.id == int(plan_id)).first()
        if not plan:
            return {"error": "Plan not found"}

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"OTTO {plan.name.title()} Plan",
                    },
                    "unit_amount": int(plan.price * 100) if plan.price else 0,
                    "recurring": {
                        "interval": "month",
                    },
                },
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "org_id": org_id,
                "plan_id": plan_id,
            },
        )

        return {"session_id": session.id, "url": session.url}
    finally:
        db.close()


def handle_webhook(payload: bytes, signature: str) -> Dict[str, Any]:
    """Handle Stripe webhook events."""
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, signature, webhook_secret
        )
    except ValueError:
        return {"error": "Invalid payload"}
    except stripe.error.SignatureVerificationError:
        return {"error": "Invalid signature"}

    event_type = event.get("type")
    data = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        return handle_checkout_completed(data)
    elif event_type == "customer.subscription.updated":
        return handle_subscription_updated(data)
    elif event_type == "customer.subscription.deleted":
        return handle_subscription_deleted(data)
    elif event_type == "invoice.payment_failed":
        return handle_payment_failed(data)

    return {"status": "ignored"}


def handle_checkout_completed(session: Dict) -> Dict:
    """Handle successful checkout."""
    from models.subscription import Subscription
    from database import SessionLocal

    db = SessionLocal()
    try:
        org_id = session.get("metadata", {}).get("org_id")
        plan_id = session.get("metadata", {}).get("plan_id")
        stripe_sub_id = session.get("subscription")

        period_end = datetime.utcnow() + timedelta(days=30)

        existing = db.query(Subscription).filter(
            Subscription.organization_id == org_id
        ).first()

        if existing:
            existing.plan_id = int(plan_id)
            existing.status = "active"
            existing.current_period_end = period_end
        else:
            sub = Subscription(
                organization_id=org_id,
                plan_id=int(plan_id),
                status="active",
                current_period_end=period_end
            )
            db.add(sub)

        db.commit()

        return {"status": "success", "org_id": org_id}
    finally:
        db.close()


def handle_subscription_updated(subscription: Dict) -> Dict:
    """Handle subscription update."""
    from models.subscription import Subscription
    from database import SessionLocal

    db = SessionLocal()
    try:
        stripe_sub_id = subscription.get("id")
        status = "active" if subscription.get("status") == "active" else "cancelled"

        period_end = datetime.utcnow()
        if subscription.get("current_period_end"):
            period_end = datetime.fromtimestamp(
                subscription.get("current_period_end", 0)
            )

        db.query(Subscription).filter(
            Subscription.organization_id == subscription.get("metadata", {}).get("org_id")
        ).update({
            "status": status,
            "current_period_end": period_end
        })
        db.commit()

        return {"status": "updated"}
    finally:
        db.close()


def handle_subscription_deleted(subscription: Dict) -> Dict:
    """Handle subscription cancellation."""
    from models.subscription import Subscription
    from database import SessionLocal

    db = SessionLocal()
    try:
        db.query(Subscription).filter(
            Subscription.organization_id == subscription.get("metadata", {}).get("org_id")
        ).update({"status": "cancelled"})
        db.commit()

        return {"status": "cancelled"}
    finally:
        db.close()


def handle_payment_failed(invoice: Dict) -> Dict:
    """Handle failed payment."""
    return {"status": "payment_failed", "invoice_id": invoice.get("id")}


def update_subscription_status(org_id: str, status: str) -> bool:
    """Manually update subscription status."""
    from models.subscription import Subscription
    from database import SessionLocal

    db = SessionLocal()
    try:
        result = db.query(Subscription).filter(
            Subscription.organization_id == org_id,
            Subscription.status == "active"
        ).update({"status": status})
        db.commit()
        return result > 0
    finally:
        db.close()