import { db } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  try {
    // 1. Clear existing data
    console.log("Cleaning old data...");
    db.delete(schema.items).run();
    db.delete(schema.groups).run();
    db.delete(schema.users).run();

    // 2. Create Admin User (password: admin123)
    console.log("Creating admin user...");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("admin123", salt);

    db.insert(schema.users)
      .values({
        id: nanoid(),
        email: "admin@example.com",
        passwordHash,
        role: "admin",
      })
      .run();

    // 3. Create Groups
    console.log("Creating groups...");
    const mediaGroupId = nanoid();
    const systemGroupId = nanoid();

    db.insert(schema.groups)
      .values([
        { id: mediaGroupId, name: "Media & Downloads", order: 0 },
        { id: systemGroupId, name: "System", order: 1 },
      ])
      .run();

    // 4. Create Items
    console.log("Creating items...");
    db.insert(schema.items)
      .values([
        // Media Group
        {
          id: nanoid(),
          groupId: mediaGroupId,
          label: "Plex",
          href: "http://plex.local:32400",
          serviceType: "plex",
          serviceUrl: "http://plex.local:32400",
          order: 0,
        },
        {
          id: nanoid(),
          groupId: mediaGroupId,
          label: "Radarr",
          href: "http://radarr.local:7878",
          serviceType: "radarr",
          serviceUrl: "http://radarr.local:7878",
          order: 1,
        },
        {
          id: nanoid(),
          groupId: mediaGroupId,
          label: "Sonarr",
          href: "http://sonarr.local:8989",
          serviceType: "sonarr",
          serviceUrl: "http://sonarr.local:8989",
          order: 2,
        },
        // System Group
        {
          id: nanoid(),
          groupId: systemGroupId,
          label: "AdGuard Home",
          href: "http://adguard.local",
          serviceType: "adguard",
          serviceUrl: "http://adguard.local",
          order: 0,
        },
        {
          id: nanoid(),
          groupId: systemGroupId,
          label: "Proxmox",
          href: "https://proxmox.local:8006",
          serviceType: "proxmox",
          serviceUrl: "https://proxmox.local:8006",
          order: 1,
        },
      ])
      .run();

    console.log("✅ Seeding complete!");
    console.log("Admin credentials:");
    console.log("  Email: admin@example.com");
    console.log("  Password: admin123");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

main();
