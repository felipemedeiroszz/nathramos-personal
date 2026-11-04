"use server";
import {
  requireManagedStudent,
  requireManagedRecord,
  requireOwnedPrescription,
  requireOwnedKitItem,
} from "@/lib/auth/platform";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProductImageUploadService } from "@/services/ProductImageUploadService";
import { requireRole } from "@/lib/auth/access";
import { DietService } from "@/services/DietService";
import { SupplementService } from "@/services/SupplementService";
import { ExamService } from "@/services/ExamService";
import { EbookService } from "@/services/EbookService";
import { ContentPageService } from "@/services/ContentPageService";
import { createServiceClientSSR } from "@/lib/supabase/server";
import type {
  UpsertDietFoodInput,
  SaveDietKitInput,
  SyncDietKitStudentsInput,
  SyncStudentDietKitsInput,
} from "@/schemas/diets";
import type {
  UpsertSupplementInput,
  SaveSupplementKitInput,
  SyncSupplementKitStudentsInput,
  SyncStudentSupplementKitsInput,
} from "@/schemas/supplements";
import type { UpsertExamInput, ReviewExamInput } from "@/schemas/exams";
import type { UpsertEbookInput } from "@/schemas/ebooks";
import type { UpsertContentPageInput } from "@/schemas/contentPages";

// ---------------------------------------------------------------------
// ALIMENTOS (CATÁLOGO)
// ---------------------------------------------------------------------
export async function upsertDietFoodAction(input: UpsertDietFoodInput) {
  const { userId: adminId } = await requireRole(["admin"], "/dashboard");
  try {
    const saved = await DietService.upsertFood(input, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar alimento." };
    }
    revalidatePath("/[locale]/admin/alimentos", "page");
    revalidatePath("/[locale]/admin/kits/dietas", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar alimento.",
    };
  }
}

export async function deleteDietFoodAction(id: string) {
  const { userId: adminId } = await requireRole(["admin"], "/dashboard");
  try {
    const ok = await DietService.deleteFood(id, adminId);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir alimento." };
    }
    revalidatePath("/[locale]/admin/alimentos", "page");
    revalidatePath("/[locale]/admin/kits/dietas", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir alimento.",
    };
  }
}

// ---------------------------------------------------------------------
// KITS DE DIETA
// ---------------------------------------------------------------------
export async function saveDietKitAction(input: SaveDietKitInput) {
  const { userId: adminId } = await requireRole(
    ["admin", "coach"],
    "/dashboard",
  );
  try {
    await requireOwnedPrescription("diet_kits", input.kit.id);
    if (input.kit.id && !input.kit.revision)
      throw new Error("Recarregue a prescrição antes de editar.");
    const saved = await DietService.saveKit(input, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar kit." };
    }
    revalidatePath("/[locale]/admin/kits/dietas", "page");
    revalidatePath("/[locale]/dieta", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar kit.",
    };
  }
}

export async function deleteDietKitAction(id: string) {
  const { userId: adminId } = await requireRole(
    ["admin", "coach"],
    "/dashboard",
  );
  try {
    await requireOwnedPrescription("diet_kits", id);
    const ok = await DietService.deleteKit(id, adminId);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir kit." };
    }
    revalidatePath("/[locale]/admin/kits/dietas", "page");
    revalidatePath("/[locale]/dieta", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir kit.",
    };
  }
}

export async function syncDietKitStudentsAction(
  input: SyncDietKitStudentsInput,
) {
  const { userId: adminId } = await requireRole(
    ["admin", "coach"],
    "/dashboard",
  );
  try {
    if (!input.expected_fingerprint)
      throw new Error("Recarregue as atribuições antes de salvar.");
    for (const id of input.student_ids) await requireManagedStudent(id);
    await requireOwnedPrescription("diet_kits", input.kit_id);
    const ok = await DietService.syncKitStudents(input, adminId);
    if (!ok) {
      return {
        success: false as const,
        message: "Falha ao vincular kit aos alunos.",
      };
    }
    revalidatePath("/[locale]/admin/kits/dietas", "page");
    revalidatePath("/[locale]/dieta", "page");
    revalidatePath("/[locale]/admin/alunos/[id]", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao vincular kit aos alunos.",
    };
  }
}

export async function syncStudentDietKitsAction(
  input: SyncStudentDietKitsInput,
) {
  const { userId: adminId } = await requireRole(
    ["admin", "coach"],
    "/dashboard",
  );
  try {
    if (!input.expected_fingerprint)
      throw new Error("Recarregue as atribuições antes de salvar.");
    await requireManagedStudent(input.student_id);
    const ok = await DietService.syncStudentKits(input, adminId);
    if (!ok) {
      return {
        success: false as const,
        message: "Falha ao salvar os vínculos do aluno.",
      };
    }
    revalidatePath("/[locale]/admin/alunos/[id]", "page");
    revalidatePath("/[locale]/dieta", "page");
    revalidatePath("/[locale]/admin/kits/dietas", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar os vínculos do aluno.",
    };
  }
}

// ---------------------------------------------------------------------
// SUPLEMENTOS
// ---------------------------------------------------------------------
export async function upsertSupplementAction(input: UpsertSupplementInput) {
  const { userId: adminId } = await requireRole(["admin"], "/dashboard");
  try {
    const saved = await SupplementService.upsertSupplement(input, adminId);
    if (!saved) {
      return {
        success: false as const,
        message: "Falha ao salvar suplemento.",
      };
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
  await requireRole(["admin"], "/dashboard");
  try {
    const ok = await SupplementService.deleteSupplement(id);
    if (!ok) {
      return {
        success: false as const,
        message: "Falha ao excluir suplemento.",
      };
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
// KITS DE SUPLEMENTOS
// ---------------------------------------------------------------------
export async function saveSupplementKitAction(input: SaveSupplementKitInput) {
  const { userId: adminId } = await requireRole(
    ["admin", "coach"],
    "/dashboard",
  );
  try {
    await requireOwnedPrescription("supplement_kits", input.kit.id);
    if (input.kit.id && !input.kit.revision)
      throw new Error("Recarregue a prescrição antes de editar.");
    const saved = await SupplementService.saveKit(input, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar kit." };
    }
    revalidatePath("/[locale]/admin/kits/suplementos", "page");
    revalidatePath("/[locale]/suplementos", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar kit.",
    };
  }
}

export async function deleteSupplementKitAction(id: string) {
  const { userId: adminId } = await requireRole(
    ["admin", "coach"],
    "/dashboard",
  );
  try {
    await requireOwnedPrescription("supplement_kits", id);
    const ok = await SupplementService.deleteKit(id, adminId);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir kit." };
    }
    revalidatePath("/[locale]/admin/kits/suplementos", "page");
    revalidatePath("/[locale]/suplementos", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir kit.",
    };
  }
}

export async function syncSupplementKitStudentsAction(
  input: SyncSupplementKitStudentsInput,
) {
  const { userId: adminId } = await requireRole(
    ["admin", "coach"],
    "/dashboard",
  );
  try {
    if (!input.expected_fingerprint)
      throw new Error("Recarregue as atribuições antes de salvar.");
    for (const id of input.student_ids) await requireManagedStudent(id);
    await requireOwnedPrescription("supplement_kits", input.kit_id);
    const ok = await SupplementService.syncKitStudents(input, adminId);
    if (!ok) {
      return {
        success: false as const,
        message: "Falha ao vincular kit aos alunos.",
      };
    }
    revalidatePath("/[locale]/admin/kits/suplementos", "page");
    revalidatePath("/[locale]/suplementos", "page");
    revalidatePath("/[locale]/admin/alunos/[id]", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao vincular kit aos alunos.",
    };
  }
}

export async function syncStudentSupplementKitsAction(
  input: SyncStudentSupplementKitsInput,
) {
  const { userId: adminId } = await requireRole(
    ["admin", "coach"],
    "/dashboard",
  );
  try {
    if (!input.expected_fingerprint)
      throw new Error("Recarregue as atribuições antes de salvar.");
    await requireManagedStudent(input.student_id);
    const ok = await SupplementService.syncStudentKits(input, adminId);
    if (!ok) {
      return {
        success: false as const,
        message: "Falha ao salvar os vínculos do aluno.",
      };
    }
    revalidatePath("/[locale]/admin/alunos/[id]", "page");
    revalidatePath("/[locale]/suplementos", "page");
    revalidatePath("/[locale]/admin/kits/suplementos", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar os vínculos do aluno.",
    };
  }
}

// ---------------------------------------------------------------------
// EXAMES
// ---------------------------------------------------------------------
export async function upsertExamAction(input: UpsertExamInput) {
  const { userId: adminId } = await requireRole(
    ["admin", "coach"],
    "/dashboard",
  );
  try {
    await requireManagedStudent(input.user_id);
    if (input.id) await requireManagedRecord("exams", input.id, "user_id");
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
    await requireManagedRecord("exams", id, "user_id");
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

export async function reviewExamAction(input: ReviewExamInput) {
  const { userId: adminId } = await requireRole(
    ["admin", "coach"],
    "/dashboard",
  );
  try {
    await requireManagedRecord("exams", input.id, "user_id");
    const saved = await ExamService.reviewExam(input, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar parecer." };
    }
    revalidatePath("/[locale]/admin/exames", "page");
    revalidatePath("/[locale]/exames", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar parecer.",
    };
  }
}

// ---------------------------------------------------------------------
// E-BOOKS
// ---------------------------------------------------------------------
export async function upsertEbookAction(input: UpsertEbookInput) {
  const { userId: adminId } = await requireRole(["admin"], "/dashboard");
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
  await requireRole(["admin"], "/dashboard");
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

// ---------------------------------------------------------------------
// PÁGINAS INSTITUCIONAIS (TERMOS / PRIVACIDADE / FAQ)
// ---------------------------------------------------------------------
export async function upsertContentPageAction(input: UpsertContentPageInput) {
  const { userId: adminId } = await requireRole(["admin"], "/dashboard");
  try {
    const saved = await ContentPageService.upsert(input, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar a página." };
    }
    revalidatePath("/[locale]/admin/paginas", "page");
    revalidatePath("/[locale]/termos", "page");
    revalidatePath("/[locale]/privacidade", "page");
    revalidatePath("/[locale]/faq", "page");
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar a página.",
    };
  }
}

// ---------------------------------------------------------------------
// IMAGENS DE PRODUTOS (ALIMENTOS / SUPLEMENTOS)
// ---------------------------------------------------------------------
export async function prepareProductImageUploadAction(input: unknown) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  try {
    return { success: true as const, data: await ProductImageUploadService.prepare(userId, input) };
  } catch {
    return { success: false as const, message: "Não foi possível autorizar a imagem. Use PNG, JPG ou WEBP de até 5 MiB." };
  }
}

export async function completeProductImageUploadAction(path: string) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  try {
    z.string().max(200).parse(path);
    return { success: true as const, url: await ProductImageUploadService.complete(userId, path) };
  } catch {
    return { success: false as const, message: "Não foi possível validar a imagem. Use PNG, JPG ou WEBP de até 5 MiB." };
  }
}
