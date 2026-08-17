import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { resolveTenant } from "@/lib/services/auth.service";
import { subscriptionService } from "@/lib/services/subscription.service";

export async function POST(request: Request) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PRO_PRICE_ID not configured" },
      { status: 500 },
    );
  }

  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant.name,
      metadata: { tenantId: tenant.id },
    });
    customerId = customer.id;
    await subscriptionService.linkCustomer(tenant.id, customerId);
  }

  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/?checkout=success`,
    cancel_url: `${base}/?checkout=cancel`,
    metadata: { tenantId: tenant.id },
  });

  return NextResponse.json({ url: session.url }, { status: 200 });
}