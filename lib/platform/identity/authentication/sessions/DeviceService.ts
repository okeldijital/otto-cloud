/**
 * DeviceService — parse UA + register/update device records (A.3).
 * Non-invasive fingerprinting from request metadata only.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export type ParsedDevice = {
  name: string;
  browser: string;
  os: string;
  platform: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  fingerprintKey: string;
};

export function parseUserAgent(userAgent: string | null | undefined): ParsedDevice {
  const ua = userAgent || "";
  let browser = "Unknown";
  let os = "Unknown";
  let platform = "unknown";
  let deviceType: ParsedDevice["deviceType"] = "unknown";

  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (ua) browser = "Other";

  // Order matters: iOS UAs can contain "Mac OS X"
  if (/iPhone|iPad|iPod|iOS/i.test(ua)) {
    os = "iOS";
    platform = "ios";
  } else if (/Android/i.test(ua)) {
    os = "Android";
    platform = "android";
  } else if (/Windows/i.test(ua)) {
    os = "Windows";
    platform = "windows";
  } else if (/Mac OS X|Macintosh/i.test(ua)) {
    os = "macOS";
    platform = "macos";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
    platform = "linux";
  }

  if (/iPad|Tablet/i.test(ua)) deviceType = "tablet";
  else if (/Mobi|iPhone|iPod|Android.*Mobile/i.test(ua)) deviceType = "mobile";
  else if (ua) deviceType = "desktop";

  const name = `${browser} on ${os}`;
  const fingerprintKey = createHash("sha256")
    .update(`${browser}|${os}|${deviceType}|${ua.slice(0, 200)}`)
    .digest("hex")
    .slice(0, 32);

  return { name, browser, os, platform, deviceType, fingerprintKey };
}

export class DeviceService {
  parse(userAgent?: string | null): ParsedDevice {
    return parseUserAgent(userAgent);
  }

  /**
   * Find or create device for identity + fingerprint; touch lastSeen.
   * Emits whether this is a new device registration.
   */
  async registerOrTouch(params: {
    identityId: string;
    userAgent?: string | null;
  }): Promise<{ deviceId: string; isNew: boolean; parsed: ParsedDevice }> {
    const parsed = this.parse(params.userAgent);
    const existing = await prisma.iamDevice.findFirst({
      where: {
        identityId: params.identityId,
        fingerprintKey: parsed.fingerprintKey,
      },
    });

    if (existing) {
      await prisma.iamDevice.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          userAgent: params.userAgent ?? existing.userAgent,
          name: parsed.name,
          browser: parsed.browser,
          os: parsed.os,
          platform: parsed.platform,
          deviceType: parsed.deviceType,
        },
      });
      return { deviceId: existing.id, isNew: false, parsed };
    }

    const created = await prisma.iamDevice.create({
      data: {
        identityId: params.identityId,
        name: parsed.name,
        browser: parsed.browser,
        os: parsed.os,
        platform: parsed.platform,
        deviceType: parsed.deviceType,
        userAgent: params.userAgent ?? null,
        fingerprintKey: parsed.fingerprintKey,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    return { deviceId: created.id, isNew: true, parsed };
  }
}

export const deviceService = new DeviceService();
