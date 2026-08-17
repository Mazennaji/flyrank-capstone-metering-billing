import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { subscriptionService } from "@/lib/services/subscription.service";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (await subscriptionService.alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.customer === "string") {
        await subscriptionService.setPlanByCustomer(
          session.customer,
          "pro",
          "active",
        );
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      if (typeof sub.customer === "string") {
        const plan = sub.status === "active" ? "pro" : "free";
        await subscriptionService.setPlanByCustomer(
          sub.customer,
          plan,
          sub.status,
        );
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      if (typeof sub.customer === "string") {
        await subscriptionService.setPlanByCustomer(
          sub.customer,
          "free",
          "canceled",
        );
      }
      break;
    }
  }

  await subscriptionService.markProcessed(event.id);

  return NextResponse.json({ received: true }, { status: 200 });
}