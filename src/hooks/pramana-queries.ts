import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getAdminRequest,
  getCustomerProfile,
  getCustomerStatus,
  listAdminRequests,
  listAuditLogs,
  listCustomers,
  processAdminRequest,
  rejectAdminRequest,
  submitDocuments,
  updateAndProcessAdminRequest,
  type AdminActionResult,
  type ApiError,
  type ProcessPayload,
  type RejectPayload,
  type SubmitDocumentsPayload,
  type UpdateAndProcessPayload,
} from "@/lib/pramana-api";

// ---------------------------------------------------------------------------
// Query keys — the single source of truth for cache invalidation.
// ---------------------------------------------------------------------------

export const queryKeys = {
  customerProfile: (customerId: string | null) => ["customer", "profile", customerId] as const,
  customerStatus: (customerId: string | null) => ["customer", "status", customerId] as const,
  customerList: ["customers", "list"] as const,
  adminRequests: ["admin", "requests"] as const,
  adminRequest: (requestId: string | null) => ["admin", "request", requestId] as const,
  auditLogs: ["audit", "logs"] as const,
};

/** Invalidates everything an admin decision affects, plus customer-side data. */
function invalidateAfterAdminAction(
  queryClient: ReturnType<typeof useQueryClient>,
  requestId: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminRequests });
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminRequest(requestId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs, refetchType: "all" });
  void queryClient.invalidateQueries({ queryKey: ["customer"] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.customerList });
}

/** True when the fetch failed with a "record not found" API response. */
export function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as ApiError).status === 404
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const baseQueryOptions = {
  retry: false,
  refetchOnWindowFocus: false,
} as const;

export function useCustomerProfile(customerId: string | null) {
  return useQuery({
    ...baseQueryOptions,
    queryKey: queryKeys.customerProfile(customerId),
    queryFn: () => getCustomerProfile(customerId!),
    enabled: Boolean(customerId) && typeof window !== "undefined",
  });
}

export function useCustomerStatus(customerId: string | null) {
  return useQuery({
    ...baseQueryOptions,
    queryKey: queryKeys.customerStatus(customerId),
    queryFn: () => getCustomerStatus(customerId!),
    enabled: Boolean(customerId) && typeof window !== "undefined",
  });
}

export function useCustomerList() {
  return useQuery({
    ...baseQueryOptions,
    queryKey: queryKeys.customerList,
    queryFn: listCustomers,
    enabled: typeof window !== "undefined",
    placeholderData: keepPreviousData,
  });
}

export function useAdminRequests() {
  return useQuery({
    ...baseQueryOptions,
    queryKey: queryKeys.adminRequests,
    queryFn: listAdminRequests,
    enabled: typeof window !== "undefined",
    placeholderData: keepPreviousData,
  });
}

export function useAdminRequest(requestId: string | null) {
  return useQuery({
    ...baseQueryOptions,
    queryKey: queryKeys.adminRequest(requestId),
    queryFn: () => getAdminRequest(requestId!),
    enabled: Boolean(requestId) && typeof window !== "undefined",
  });
}

export function useAuditLogs() {
  return useQuery({
    ...baseQueryOptions,
    queryKey: queryKeys.auditLogs,
    queryFn: listAuditLogs,
    enabled: typeof window !== "undefined",
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * POST /documents/submit — sends document-type metadata only; selected file
 * bytes stay on the customer's device (the backend endpoint does not accept
 * file uploads yet, see INTEGRATION_GAPS.md).
 */
export function useSubmitDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitDocumentsPayload) => submitDocuments(payload),
    onSuccess: (result, payload) => {
      toast.success(result.message || `Request ${result.requestId} submitted.`);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customerStatus(payload.customerId ?? null),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customerProfile(payload.customerId ?? null),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminRequests });
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerList });
    },
  });
}

export function useProcessRequest(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProcessPayload) => processAdminRequest(requestId, payload),
    onSuccess: (result) => {
      toast.success(result.message || `Request marked ${result.status}.`);
      invalidateAfterAdminAction(queryClient, requestId);
    },
  });
}

export function useUpdateAndProcessRequest(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateAndProcessPayload) =>
      updateAndProcessAdminRequest(requestId, payload),
    onSuccess: (result: AdminActionResult) => {
      toast.success(result.message || `Request marked ${result.status}.`);
      invalidateAfterAdminAction(queryClient, requestId);
    },
  });
}

export function useRejectRequest(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RejectPayload) => rejectAdminRequest(requestId, payload),
    onSuccess: (result) => {
      toast.success(result.message || "Request rejected.");
      invalidateAfterAdminAction(queryClient, requestId);
    },
  });
}
