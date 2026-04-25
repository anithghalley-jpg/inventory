import { v } from "convex/values";
import { mutation, MutationCtx } from "./_generated/server";
import { enqueueSheetsSyncJob } from "./sheetsSync";

const SEED_TAG = "seed:demo";

type SeedUser = {
  email: string;
  name: string;
  role: "ADMIN" | "TEAM" | "USER";
  status: "APPROVED" | "PENDING" | "REJECTED";
  createdDate: string;
  laptopStatus: string;
  sessionStart: string;
  sessionEnd: string;
  totalTime: number;
  rfid: string;
  myPageLink: string;
  tags: string[];
  note: string;
};

type SeedInventoryItem = {
  itemId: string;
  name: string;
  quantity: number;
  category: string;
  company: string;
  imageUrl: string;
  remarks: string;
  links: string;
  tags: string[];
};

type SeedRequest = {
  date: string;
  userEmail: string;
  userName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  status: string;
  actionBy: string;
  returnStatus: string;
  returnTarget: string;
  returnReceiver: string;
  returnRemarks: string;
};

type SeedFabAcademyEntry = {
  entryId: string;
  studentName: string;
  imageUrl: string;
  fabYear: string;
  videoUrl: string;
  documentationUrl: string;
  remarks: string;
};

const seedUsers: SeedUser[] = [
  {
    email: "admin.seed@inventory.test",
    name: "Asha Dorji",
    role: "ADMIN" as const,
    status: "APPROVED" as const,
    createdDate: "2026-03-25T09:00:00.000Z",
    laptopStatus: "Online",
    sessionStart: "2026-03-30T08:45:00.000Z",
    sessionEnd: "",
    totalTime: 420,
    rfid: "RFID-SEED-001",
    myPageLink: "https://example.com/team/asha-dorji",
    tags: [SEED_TAG, "admin", "operations"],
    note: "Demo admin account for backend checks.",
  },
  {
    email: "team.seed@inventory.test",
    name: "Tenzin Wangmo",
    role: "TEAM" as const,
    status: "APPROVED" as const,
    createdDate: "2026-03-26T10:30:00.000Z",
    laptopStatus: "Offline",
    sessionStart: "",
    sessionEnd: "2026-03-29T16:20:00.000Z",
    totalTime: 185,
    rfid: "RFID-SEED-002",
    myPageLink: "https://example.com/team/tenzin-wangmo",
    tags: [SEED_TAG, "team", "electronics"],
    note: "Seed team member used for approved checkout scenarios.",
  },
  {
    email: "user.seed@inventory.test",
    name: "Pema Lhamo",
    role: "USER" as const,
    status: "PENDING" as const,
    createdDate: "2026-03-28T12:00:00.000Z",
    laptopStatus: "Offline",
    sessionStart: "",
    sessionEnd: "",
    totalTime: 32,
    rfid: "RFID-SEED-003",
    myPageLink: "https://example.com/members/pema-lhamo",
    tags: [SEED_TAG, "new-user", "3d-printing"],
    note: "Seed user waiting for approval.",
  },
];

const seedInventory: SeedInventoryItem[] = [
  {
    itemId: "seed-cnc-bits-001",
    name: "Carbide End Mill Set",
    quantity: 11,
    category: "CNC",
    company: "Fab Lab Store",
    imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80",
    remarks: "Demo stock for machining checkout flows.",
    links: "https://example.com/inventory/carbide-end-mill-set",
    tags: [SEED_TAG, "cutting-tools", "popular"],
  },
  {
    itemId: "seed-printer-filament-001",
    name: "PLA Filament Spool",
    quantity: 24,
    category: "3D Printing",
    company: "Maker Supply",
    imageUrl: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=900&q=80",
    remarks: "Demo consumable stock for printer requests.",
    links: "https://example.com/inventory/pla-filament-spool",
    tags: [SEED_TAG, "consumable", "filament"],
  },
  {
    itemId: "seed-arduino-kit-001",
    name: "Arduino Starter Kit",
    quantity: 6,
    category: "Electronics",
    company: "Open Lab Kits",
    imageUrl: "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=900&q=80",
    remarks: "Demo hardware kit for team borrowing.",
    links: "https://example.com/inventory/arduino-starter-kit",
    tags: [SEED_TAG, "electronics", "training"],
  },
  {
    itemId: "seed-camera-001",
    name: "Workshop DSLR Camera",
    quantity: 2,
    category: "Media",
    company: "Studio Gear",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
    remarks: "Demo media equipment for documentation requests.",
    links: "https://example.com/inventory/workshop-dslr-camera",
    tags: [SEED_TAG, "media", "documentation"],
  },
];

const seedRequests: SeedRequest[] = [
  {
    date: "2026-03-29T09:15:00.000Z",
    userEmail: "team.seed@inventory.test",
    userName: "Tenzin Wangmo",
    itemId: "seed-cnc-bits-001",
    itemName: "Carbide End Mill Set",
    quantity: 1,
    status: "APPROVED",
    actionBy: "Asha Dorji",
    returnStatus: "",
    returnTarget: "",
    returnReceiver: "",
    returnRemarks: "",
  },
  {
    date: "2026-03-29T11:40:00.000Z",
    userEmail: "user.seed@inventory.test",
    userName: "Pema Lhamo",
    itemId: "seed-printer-filament-001",
    itemName: "PLA Filament Spool",
    quantity: 2,
    status: "PENDING",
    actionBy: "",
    returnStatus: "",
    returnTarget: "",
    returnReceiver: "",
    returnRemarks: "",
  },
  {
    date: "2026-03-29T14:05:00.000Z",
    userEmail: "team.seed@inventory.test",
    userName: "Tenzin Wangmo",
    itemId: "seed-arduino-kit-001",
    itemName: "Arduino Starter Kit",
    quantity: 1,
    status: "APPROVED",
    actionBy: "Asha Dorji",
    returnStatus: "RETURN_PENDING",
    returnTarget: "Front Desk",
    returnReceiver: "",
    returnRemarks: "",
  },
  {
    date: "2026-03-30T07:50:00.000Z",
    userEmail: "admin.seed@inventory.test",
    userName: "Asha Dorji",
    itemId: "seed-camera-001",
    itemName: "Workshop DSLR Camera",
    quantity: 1,
    status: "APPROVED",
    actionBy: "Asha Dorji",
    returnStatus: "RETURN_APPROVED",
    returnTarget: "Media Shelf",
    returnReceiver: "Asha Dorji: Lens and battery checked",
    returnRemarks: "Lens and battery checked",
  },
];

const seedFabAcademyEntries: SeedFabAcademyEntry[] = [
  {
    entryId: "seed-fab-2026-sonam",
    studentName: "Sonam Choden",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
    fabYear: "2026",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    documentationUrl: "https://example.com/fab-academy/sonam-choden",
    remarks: "Focused on textile fabrication, wearable circuits, and community workshops.",
  },
  {
    entryId: "seed-fab-2025-kinley",
    studentName: "Kinley Wangchuk",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    fabYear: "2025",
    videoUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    documentationUrl: "https://example.com/fab-academy/kinley-wangchuk",
    remarks: "Built modular CNC fixtures and documented rapid prototyping workflows.",
  },
  {
    entryId: "seed-fab-2024-dechen",
    studentName: "Dechen Lhazom",
    imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=900&q=80",
    fabYear: "2024",
    videoUrl: "",
    documentationUrl: "https://example.com/fab-academy/dechen-lhazom",
    remarks: "Worked on bio-material experiments and low-cost environmental sensing.",
  },
];

async function maybeEnqueueSyncJob(
  ctx: MutationCtx,
  shouldEnqueue: boolean,
  scriptUrl: string | undefined,
  job: Omit<Parameters<typeof enqueueSheetsSyncJob>[1], "scriptUrl">,
) {
  if (!shouldEnqueue) {
    return;
  }
  if (!scriptUrl) {
    throw new Error("scriptUrl is required when enqueueSyncJobs is true");
  }
  await enqueueSheetsSyncJob(ctx, {
    ...job,
    scriptUrl,
  });
}

export const seedDemoData = mutation({
  args: {
    enqueueSyncJobs: v.optional(v.boolean()),
    scriptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const enqueueSyncJobs = args.enqueueSyncJobs ?? false;

    for (const user of seedUsers) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", user.email))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, user);
      } else {
        await ctx.db.insert("users", user);
      }

      await maybeEnqueueSyncJob(ctx, enqueueSyncJobs, args.scriptUrl, {
        entityType: "users",
        entityKey: user.email,
        operation: "upsert",
        payload: user,
      });
    }

    for (const item of seedInventory) {
      const existing = await ctx.db
        .query("inventory")
        .withIndex("by_itemId", (q) => q.eq("itemId", item.itemId))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, item);
      } else {
        await ctx.db.insert("inventory", item);
      }

      await maybeEnqueueSyncJob(ctx, enqueueSyncJobs, args.scriptUrl, {
        entityType: "inventory",
        entityKey: item.itemId,
        operation: "upsert",
        payload: item,
      });
    }

    for (const request of seedRequests) {
      const existing = await ctx.db
        .query("requests")
        .withIndex("by_date", (q) => q.eq("date", request.date))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, request);
      } else {
        await ctx.db.insert("requests", request);
      }

      await maybeEnqueueSyncJob(ctx, enqueueSyncJobs, args.scriptUrl, {
        entityType: "requests",
        entityKey: request.date,
        operation: "upsert",
        payload: request,
      });
    }

    for (const entry of seedFabAcademyEntries) {
      const existing = await ctx.db
        .query("fabAcademy")
        .withIndex("by_entryId", (q) => q.eq("entryId", entry.entryId))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, entry);
      } else {
        await ctx.db.insert("fabAcademy", entry);
      }

      await maybeEnqueueSyncJob(ctx, enqueueSyncJobs, args.scriptUrl, {
        entityType: "fabAcademy",
        entityKey: entry.entryId,
        operation: "upsert",
        payload: entry,
      });
    }

    return {
      success: true,
      seeded: {
        fabAcademy: seedFabAcademyEntries.length,
        users: seedUsers.length,
        inventory: seedInventory.length,
        requests: seedRequests.length,
      },
      tag: SEED_TAG,
    };
  },
});
