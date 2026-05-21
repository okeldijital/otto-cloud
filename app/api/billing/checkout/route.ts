import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const planId = body.plan_id || "pro";

    const planMap: Record<string, any> = {
      pro: { name: "Pro", id: "2", priceId: process.env.STRIPE_PRO_PRICE_ID },
      enterprise: { name: "Enterprise", id: "3", priceId: process.env.STRIPE_ENT_PRICE_ID },
    };

    const planInfo = planMap[planId] || planMap["pro"];
    const stripe = getStripe();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const baseAppUrl = process.env.BASE_APP_URL || "http://localhost:3000";
    const successUrl = `${baseAppUrl}/billing?success=true`;
    const cancelUrl = `${baseAppUrl}/billing?cancelled=true`;

    if (!planInfo.priceId) {
      return NextResponse.json({ error: "Stripe price ID not configured for this plan" }, { status: 400 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: planInfo.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.organization_id,
      customer_email: user.email,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Error creating checkout:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
