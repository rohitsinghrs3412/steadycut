import { mutation } from "./_generated/server";
import { getUserId } from "./lib/auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
