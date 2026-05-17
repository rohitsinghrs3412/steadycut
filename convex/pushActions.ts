"use node";

import webpush from "web-push";
import { anyApi } from "convex/server";

import { action } from "./_generated/server";

type PushSubscriptionDoc = {
  _id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  reminderHourLocal: number;
  timezone: string;
  lastSentDate?: string;
};

export const sendTest = action({
  args: {},
  handler: async (ctx) => {
    const subscription = await ctx.runQuery(
      anyApi.pushNotifications.getCurrentSubscription,
      {}
    );

    if (!subscription) {
      throw new Error("Enable notifications first.");
    }

    await sendPush(subscription, {
      title: "SteadyCut reminder",
      body: "Your daily check-in reminder is ready.",
      url: "/dashboard",
      icon: "/icon-192x192.png",
      badge: "/badge-96x96.png",
    });

    return true;
  },
});

export const sendDueReminders = action({
  args: {},
  handler: async (ctx) => {
    const subscriptions = (await ctx.runQuery(
      anyApi.pushNotifications.listDueSubscriptions,
      {}
    )) as PushSubscriptionDoc[];
    let sent = 0;

    for (const subscription of subscriptions) {
      const local = getLocalDateParts(subscription.timezone);

      if (
        local.hour !== subscription.reminderHourLocal ||
        local.minute >= 15 ||
        subscription.lastSentDate === local.date
      ) {
        continue;
      }

      try {
        await sendPush(subscription, {
          title: "Morning weigh-in?",
          body: "Log today's weight while the signal is clean.",
          url: "/dashboard",
          icon: "/icon-192x192.png",
          badge: "/badge-96x96.png",
        });
        await ctx.runMutation(anyApi.pushNotifications.markReminderSent, {
          id: subscription._id,
          date: local.date,
        });
        sent += 1;
      } catch (caught) {
        if (isGonePushSubscription(caught)) {
          await ctx.runMutation(anyApi.pushNotifications.deleteSubscriptionById, {
            id: subscription._id,
          });
        }
      }
    }

    return sent;
  },
});

async function sendPush(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: {
    title: string;
    body: string;
    url: string;
    icon?: string;
    badge?: string;
  }
) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured.");
  }

  webpush.setVapidDetails(
    "mailto:notifications@steadycut.app",
    publicKey,
    privateKey
  );

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload)
  );
}

function getLocalDateParts(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function isGonePushSubscription(caught: unknown) {
  return (
    typeof caught === "object" &&
    caught !== null &&
    "statusCode" in caught &&
    ((caught as { statusCode?: number }).statusCode === 404 ||
      (caught as { statusCode?: number }).statusCode === 410)
  );
}
