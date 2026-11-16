import { z } from "zod";

export const challengeCategories = [
  "weight_loss",
  "muscle_gain",
  "hypertrophy",
  "endurance",
  "attendance",
  "nutrition",
  "hydration",
  "cardio",
  "transformation",
  "custom",
] as const;
export const challengeGoalTypes = [
  "workout",
  "cardio",
  "water",
  "nutrition",
  "steps",
  "measurements",
  "progress",
  "custom",
] as const;
const text = (max: number) => z.string().trim().max(max);
export const challengeGoalSchema = z.object({
  title: text(150).min(1),
  description: text(2000),
  goal_type: z.enum(challengeGoalTypes),
  target_value: z.coerce.number().positive().max(100000000),
  unit: text(40).min(1),
  frequency: z.enum(["daily", "weekly", "total"]),
  points: z.coerce.number().int().min(0).max(100000),
  max_points: z.coerce.number().int().min(0).max(100000000),
  proof_type: z.enum(["none", "photo", "document"]),
  requires_approval: z.boolean(),
  is_primary: z.boolean(),
});
export const challengePrizeSchema = z.object({
  placement: z.number().int().min(1).max(100),
  name: text(150).min(1),
  description: text(2000),
  image: text(200).nullable(),
  estimated_value: z.number().min(0).max(10000000).nullable(),
  notes: text(2000),
  delivery_instructions: text(2000),
});
const id = z.uuid();
const date = z.iso.datetime({ offset: true });
const reason = text(2000).min(1);
export const challengeConfigSchema = z.object({
  title: text(150).min(1),
  description: text(10000),
  objective: text(2000),
  category: z.enum(challengeCategories),
  cover_image: text(200).nullable(),
  rules: text(10000),
  instructions: text(5000),
  requirements: text(2000),
  start_date: date,
  end_date: date,
  timezone: text(100).min(1),
  max_participants: z.number().int().min(1).max(100000).nullable(),
  visibility: z.enum(["public", "exclusive"]),
  allow_late_entry: z.boolean(),
  allow_exit: z.boolean(),
  approval_entry: z.boolean(),
  winner_type: z.enum(["single", "top3", "custom"]),
  winner_count: z.number().int().min(1).max(100),
  tie_breakers: z
    .array(z.enum(["goals", "primary", "earliest"]))
    .max(3)
    .refine((v) => new Set(v).size === v.length),
  tie_policy: z.enum(["manual", "shared"]),
  pending_policy: z.enum(["review", "reject"]),
  max_backdate_hours: z.number().int().min(0).max(168),
  goals: z.array(challengeGoalSchema).min(1).max(20),
  prizes: z.array(challengePrizeSchema).min(1).max(100),
  audience: z.array(id).max(10000),
});
export const challengeActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: text(150).min(1),
    start_date: date,
    end_date: date,
    request_id: id,
  }),
  challengeConfigSchema.extend({
    action: z.literal("save"),
    challenge_id: id,
    version: z.number().int().positive(),
    reason: text(2000),
  }),
  z.object({ action: z.literal("publish"), challenge_id: id }),
  z.object({
    action: z.literal("duplicate"),
    challenge_id: id,
    request_id: id,
  }),
  ...(["pause", "resume", "cancel", "close", "correct"] as const).map(
    (action) =>
      z.object({ action: z.literal(action), challenge_id: id, reason }),
  ),
  z.object({
    action: z.literal("join"),
    challenge_id: id,
    accept_rules: z.literal(true),
    version: z.number().int().positive(),
  }),
  z.object({ action: z.literal("leave"), challenge_id: id }),
  z.object({
    action: z.literal("approve_entry"),
    challenge_id: id,
    participant_id: id,
    approved: z.boolean(),
    reason,
  }),
  z.object({
    action: z.literal("activity"),
    challenge_id: id,
    goal_id: id,
    recorded_value: z.number().positive().max(100000000),
    activity_date: date.nullable(),
    proof_image: text(200).nullable(),
    notes: text(2000),
    request_id: id,
  }),
  z.object({
    action: z.literal("review"),
    challenge_id: id,
    activity_id: id,
    approved: z.boolean(),
    reason,
  }),
  z.object({
    action: z.literal("adjust"),
    challenge_id: id,
    participant_id: id,
    points: z
      .number()
      .int()
      .min(-1000000)
      .max(1000000)
      .refine((v) => v !== 0),
    reason,
    request_id: id,
  }),
  z.object({
    action: z.literal("confirm"),
    challenge_id: id,
    reason: text(2000),
    winners: z
      .array(
        z.object({ user_id: id, placement: z.number().int().min(1).max(100) }),
      )
      .max(1000),
  }),
  z.object({
    action: z.literal("delivery"),
    challenge_id: id,
    winner_id: id,
    status: z.enum(["pending", "contacted", "delivered"]),
    notes: text(2000),
  }),
]);
export const challengeFilterSchema = z.object({
  id: id.optional(),
  view: z.enum(["all", "mine", "future", "ongoing", "completed"]).optional(),
  q: text(150).optional(),
  from: date.optional(),
  to: date.optional(),
  students: text(100).optional(),
  validation: z.enum(["pending", "approved", "rejected"]).optional(),
  offset: z.coerce.number().int().min(0).max(100000).optional(),
  rank_offset: z.coerce.number().int().min(0).max(100000).optional(),
  participant_offset: z.coerce.number().int().min(0).max(100000).optional(),
  result_revision: z.coerce.number().int().positive().optional(),
});
export type ChallengeGoal = z.infer<typeof challengeGoalSchema> & {
  id: string;
};
export type ChallengePrize = z.infer<typeof challengePrizeSchema> & {
  id: string;
};
export type Challenge = z.infer<typeof challengeConfigSchema> & {
  id: string;
  status:
    "draft" | "published" | "paused" | "cancelled" | "review" | "completed";
  version: number;
  result_revision: number;
  result_dirty: boolean;
  participant_count: number;
  my_status: string | null;
  my_rank?: ChallengeRank | null;
  goal_count?: number;
};
export type ChallengeRank = {
  user_id: string;
  name: string;
  avatar: string | null;
  total_points: number;
  completed_goals: number;
  primary_goals: number;
  progress: number;
  rank_position: number;
};
export type ChallengeParticipant = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  total_points: number;
  joined_at: string;
};
export type ChallengeActivity = {
  id: string;
  participant_id: string;
  goal_id: string;
  recorded_value: number;
  proof_image: string | null;
  notes: string;
  activity_date: string;
  validation_status: string;
  validation_reason: string | null;
  name: string;
  goal_title: string;
  created_at: string;
};
export type ChallengeProgress = {
  goal_id: string;
  goal: ChallengeGoal;
  current_value: number;
  completed_periods: number;
  required_periods: number;
  earned_points: number;
  progress: number;
};
export type ChallengeWinner = {
  id: string;
  user_id: string;
  name: string;
  avatar: string | null;
  placement: number;
  final_points: number;
  prize_name: string;
  prize_image: string | null;
  delivery_instructions: string;
  delivery_status: string;
  delivery_notes: string;
};
export type ChallengeDetail = {
  challenge: Challenge;
  goals: ChallengeGoal[];
  prizes: ChallengePrize[];
  audience: string[] | null;
  participant: ChallengeParticipant | null;
  participant_count: number;
  progress: ChallengeProgress[];
  ranking: ChallengeRank[];
  ranking_count: number;
  my_rank: ChallengeRank | null;
  activities: ChallengeActivity[];
  participants: ChallengeParticipant[] | null;
  points: {
    id: string;
    points: number;
    description: string;
    created_at: string;
  }[];
  result: {
    revision: number;
    snapshot: {
      ranking: ChallengeRank[];
      challenge: Challenge;
      prizes: ChallengePrize[];
    };
    published_at: string | null;
  } | null;
  winners: ChallengeWinner[];
  audit:
    | {
        id: number;
        action: string;
        description: string;
        admin_name: string | null;
        created_at: string;
      }[]
    | null;
  result_history:
    | {
        revision: number;
        reason: string;
        created_at: string;
        published_at: string | null;
      }[]
    | null;
};
export type ChallengeList = {
  items: Challenge[];
  metrics: {
    total: number;
    active: number;
    ended: number;
    participants: number;
    completed_goals: number;
  } | null;
  engagement: { id: string; title: string; participants: number }[] | null;
  most_active: { user_id: string; name: string; activities: number }[] | null;
  recent_winners:
    | { user_id: string; name: string; title: string; placement: number }[]
    | null;
};
