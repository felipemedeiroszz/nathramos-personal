import { z } from "zod";

export const reactionKinds = [
  "like",
  "love",
  "strength",
  "congrats",
  "motivation",
] as const;
export type Reaction = (typeof reactionKinds)[number];
const reason = z.string().trim().min(1).max(500);
export const communityActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("post"),
    body: z.string().trim().max(5000),
    images: z.array(z.string()).max(3),
    request_id: z.uuid(),
  }),
  z.object({
    action: z.literal("edit"),
    id: z.uuid(),
    version: z.number().int().positive(),
    body: z.string().trim().max(5000),
    images: z.array(z.string()).max(3),
  }),
  z.object({
    action: z.literal("comment"),
    post_id: z.uuid(),
    parent_id: z.uuid().nullable(),
    body: z.string().trim().min(1).max(2000),
    request_id: z.uuid(),
  }),
  z.object({
    action: z.literal("react"),
    post_id: z.uuid(),
    kind: z.enum(reactionKinds).nullable(),
  }),
  z.object({
    action: z.literal("delete_post"),
    post_id: z.uuid(),
    reason: reason.optional(),
  }),
  z.object({
    action: z.literal("delete_comment"),
    id: z.uuid(),
    reason: reason.optional(),
  }),
  z.object({
    action: z.literal("restrict"),
    user_id: z.uuid(),
    until: z.iso.datetime().nullable(),
    reason,
  }),
]);
export const communityFilterSchema = z
  .object({
    mode: z
      .enum(["posts", "comments", "reactions", "members"])
      .default("posts"),
    admin: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    post: z.uuid().optional(),
    author: z.uuid().optional(),
    q: z.string().trim().max(100).optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    cursor: z.iso.datetime({ offset: true }).optional(),
    cursor_id: z.uuid().optional(),
  })
  .refine((v) => Boolean(v.cursor) === Boolean(v.cursor_id), "Invalid cursor");

export type CommunityPost = {
  id: string;
  body: string;
  images: string[];
  author_id: string;
  name: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  comment_count: number;
  reaction_count: number;
  my_reaction: Reaction | null;
  reactions: Partial<Record<Reaction, number>>;
};
export type CommunityComment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  name: string;
  avatar?: string | null;
  body: string;
  created_at: string;
  deleted?: boolean;
  reply_to?: string | null;
};
export type CommunityRestriction = { blocked_until: string; reason: string };
export type FeedResult = {
  items: (CommunityPost & CommunityComment)[];
  restriction: CommunityRestriction | null;
};
