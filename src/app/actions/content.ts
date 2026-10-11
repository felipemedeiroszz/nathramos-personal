"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/access";
import { DietService } from "@/services/DietService";
import { SupplementService } from "@/services/SupplementService";
import { ExamService } from "@/services/ExamService";
import { EbookService } from "@/services/EbookService";
import type {
  UpsertDietProgramInput,
  UpsertDietMealInput,
  UpsertDietMealItemInput,
} from "@/schemas/diets";
import type { UpsertSupplementInput } from "@/schemas/supplements";
import type { UpsertExamInput } from "@/schemas/exams";
import type { UpsertEbookInput } from "@/schemas/ebooks";

// ---------------------------------------------------------------------
// DIETAS
// ---------------------------------------------------------------------
export async function upsertDietProgramAction(input: UpsertDietProgramInput) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const saved = await DietService.upsertProgram(input, adminId, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar dieta." };
    }
    revalidatePath("/[locale]/admin/dietas", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar dieta.",
    };
  }
}

export async function deleteDietProgramAction(id: string) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await DietService.deleteProgram(id);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir dieta." };
    }
    revalidatePath("/[locale]/admin/dietas", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir dieta.",
    };
  }
}

export async function upsertDietMealAction(input: UpsertDietMealInput) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const saved = await DietService.upsertMeal(input);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar refeição." };
    }
    revalidatePath("/[locale]/admin/dietas", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar refeição.",
    };
  }
}

export async function deleteDietMealAction(id: string) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await DietService.deleteMeal(id);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir refeição." };
    }
    revalidatePath("/[locale]/admin/dietas", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir refeição.",
    };
  }
}

export async function upsertDietMealItemAction(input: UpsertDietMealItemInput) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const saved = await DietService.upsertMealItem(input);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar item." };
    }
    revalidatePath("/[locale]/admin/dietas", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar item.",
    };
  }
}

export async function deleteDietMealItemAction(id: string) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await DietService.deleteMealItem(id);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir item." };
    }
    revalidatePath("/[locale]/admin/dietas", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir item.",
    };
  }
}

// ---------------------------------------------------------------------
// SUPLEMENTOS
// ---------------------------------------------------------------------
export async function upsertSupplementAction(input: UpsertSupplementInput) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const saved = await SupplementService.upsertSupplement(input, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar suplemento." };
    }
    revalidatePath("/[locale]/admin/suplementos", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar suplemento.",
    };
  }
}

export async function deleteSupplementAction(id: string) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await SupplementService.deleteSupplement(id);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir suplemento." };
    }
    revalidatePath("/[locale]/admin/suplementos", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir suplemento.",
    };
  }
}

// ---------------------------------------------------------------------
// EXAMES
// ---------------------------------------------------------------------
export async function upsertExamAction(input: UpsertExamInput) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const saved = await ExamService.upsertExam(input, input.user_id, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar exame." };
    }
    revalidatePath("/[locale]/admin/exames", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar exame.",
    };
  }
}

export async function deleteExamAction(id: string) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await ExamService.deleteExam(id);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir exame." };
    }
    revalidatePath("/[locale]/admin/exames", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir exame.",
    };
  }
}

// ---------------------------------------------------------------------
// E-BOOKS
// ---------------------------------------------------------------------
export async function upsertEbookAction(input: UpsertEbookInput) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const saved = await EbookService.upsertEbook(input, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar e-book." };
    }
    revalidatePath("/[locale]/admin/ebooks", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar e-book.",
    };
  }
}

export async function deleteEbookAction(id: string) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await EbookService.deleteEbook(id);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir e-book." };
    }
    revalidatePath("/[locale]/admin/ebooks", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir e-book.",
    };
  }
}
