// backend/services/account-deletion.ts
// Comprehensive account deletion service with anonymization for compliance

import { Storage } from '@google-cloud/storage';
import { supabase } from '../lib/supabase';

const storage = new Storage();
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;

/**
 * Result of the account deletion operation
 */
export interface DeletionResult {
  success: boolean;
  deletedRecords: {
    gcsFiles: number;
    userDocuments: number;
    chatSessions: number;
    conversations: number;
    policies: number;
    claims: number;
    anonymizedPayments: number;
    anonymizedAuditTrail: number;
  };
  errors: string[];
  duration: number;
}

/**
 * Delete GCS files with concurrency limit
 * Uses Promise.all with chunked batches to prevent timeout
 */
async function deleteGCSFilesWithConcurrency(
  files: { gcs_bucket: string; gcs_path: string }[],
  concurrencyLimit: number = 5
): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  // Process in chunks
  for (let i = 0; i < files.length; i += concurrencyLimit) {
    const chunk = files.slice(i, i + concurrencyLimit);

    const results = await Promise.allSettled(
      chunk.map(async (file) => {
        try {
          await storage.bucket(file.gcs_bucket).file(file.gcs_path).delete();
          return true;
        } catch (error) {
          // File might not exist - that's OK
          if ((error as any)?.code === 404) {
            return true;
          }
          throw error;
        }
      })
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        deleted++;
      } else {
        const file = chunk[index];
        errors.push(`Failed to delete GCS file ${file.gcs_path}: ${result.reason}`);
        console.warn(`⚠️ GCS delete failed for ${file.gcs_path}:`, result.reason);
      }
    });
  }

  return { deleted, errors };
}

/**
 * Anonymize audit_trail records for a user
 * Keeps the record for compliance but removes PII
 */
async function anonymizeAuditTrail(internalUserId: number): Promise<number> {
  const { data, error } = await supabase
    .from('audit_trail')
    .update({
      user_id: null,
      // If there's any PII in the changes jsonb, we could sanitize it here
    })
    .eq('user_id', internalUserId)
    .select('id');

  if (error) {
    console.error('❌ Error anonymizing audit_trail:', error);
    throw new Error(`Failed to anonymize audit_trail: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Anonymize payments records for a user
 * Keeps transaction records for legal reporting but removes user reference
 */
async function anonymizePayments(internalUserId: number): Promise<number> {
  const { data, error } = await supabase
    .from('payments')
    .update({
      user_id: null,
    })
    .eq('user_id', internalUserId)
    .select('id');

  if (error) {
    console.error('❌ Error anonymizing payments:', error);
    throw new Error(`Failed to anonymize payments: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Delete all user documents from database and GCS
 */
async function deleteUserDocuments(
  authUserId: string
): Promise<{ dbRecords: number; gcsFiles: number; errors: string[] }> {
  // 1. Fetch all user documents with GCS paths
  const { data: documents, error: fetchError } = await supabase
    .from('user_documents')
    .select('id, gcs_bucket, gcs_path')
    .eq('user_id', authUserId);

  if (fetchError) {
    console.error('❌ Error fetching user documents:', fetchError);
    throw new Error(`Failed to fetch user documents: ${fetchError.message}`);
  }

  const gcsFiles = documents?.filter(d => d.gcs_bucket && d.gcs_path) || [];

  // 2. Delete GCS files with concurrency limit
  let gcsResult = { deleted: 0, errors: [] as string[] };
  if (gcsFiles.length > 0 && GCS_BUCKET_NAME) {
    console.log(`🗑️ Deleting ${gcsFiles.length} GCS files...`);
    gcsResult = await deleteGCSFilesWithConcurrency(
      gcsFiles.map(d => ({ gcs_bucket: d.gcs_bucket, gcs_path: d.gcs_path })),
      5 // Concurrency limit
    );
  }

  // 3. Delete database records
  const { error: deleteError } = await supabase
    .from('user_documents')
    .delete()
    .eq('user_id', authUserId);

  if (deleteError) {
    console.error('❌ Error deleting user_documents records:', deleteError);
    throw new Error(`Failed to delete user_documents: ${deleteError.message}`);
  }

  return {
    dbRecords: documents?.length || 0,
    gcsFiles: gcsResult.deleted,
    errors: gcsResult.errors,
  };
}

/**
 * Delete conversation embeddings for a user's conversations
 */
async function deleteConversationEmbeddings(internalUserId: number): Promise<number> {
  // Get conversation IDs for this user's sessions
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', internalUserId);

  if (!sessions || sessions.length === 0) return 0;

  const sessionIds = sessions.map(s => s.id);

  // Get conversation IDs
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .in('session_id', sessionIds);

  if (!conversations || conversations.length === 0) return 0;

  const conversationIds = conversations.map(c => c.id);

  // Delete embeddings
  const { data: deleted, error } = await supabase
    .from('conversation_embeddings')
    .delete()
    .in('conversation_id', conversationIds)
    .select('id');

  if (error) {
    console.error('❌ Error deleting conversation_embeddings:', error);
    // Non-fatal - continue with deletion
  }

  return deleted?.length || 0;
}

/**
 * Delete feedback records
 */
async function deleteFeedback(internalUserId: number): Promise<number> {
  // Delete feedback linked to user directly
  const { data: userFeedback } = await supabase
    .from('feedback')
    .delete()
    .eq('user_id', internalUserId)
    .select('id');

  // Also delete feedback linked to user's conversations
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', internalUserId);

  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map(s => s.id);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .in('session_id', sessionIds);

    if (conversations && conversations.length > 0) {
      await supabase
        .from('feedback')
        .delete()
        .in('conversation_id', conversations.map(c => c.id));
    }
  }

  return userFeedback?.length || 0;
}

/**
 * Delete chat feedback records
 */
async function deleteChatFeedback(internalUserId: number): Promise<number> {
  const { data, error } = await supabase
    .from('chat_feedback')
    .delete()
    .eq('user_id', internalUserId)
    .select('id');

  if (error && error.code !== 'PGRST116') {
    console.warn('⚠️ Error deleting chat_feedback:', error);
  }

  return data?.length || 0;
}

/**
 * Delete conversations for a user
 */
async function deleteConversations(internalUserId: number): Promise<number> {
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', internalUserId);

  if (!sessions || sessions.length === 0) return 0;

  const sessionIds = sessions.map(s => s.id);

  // Delete conversations (also handles those with direct user_id)
  const { data: deleted } = await supabase
    .from('conversations')
    .delete()
    .in('session_id', sessionIds)
    .select('id');

  // Also delete any conversations with direct user_id reference
  await supabase
    .from('conversations')
    .delete()
    .eq('user_id', internalUserId);

  return deleted?.length || 0;
}

/**
 * Delete chat sessions for a user
 */
async function deleteChatSessions(internalUserId: number): Promise<number> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('user_id', internalUserId)
    .select('id');

  if (error) {
    console.error('❌ Error deleting chat_sessions:', error);
    throw new Error(`Failed to delete chat_sessions: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Delete policy-related nested entities
 */
async function deletePolicyNestedEntities(policyIds: number[]): Promise<void> {
  if (policyIds.length === 0) return;

  // Get locations, vehicles, drivers for nested deletion
  const { data: locations } = await supabase
    .from('location')
    .select('id')
    .in('policy_id', policyIds);

  const { data: vehicles } = await supabase
    .from('vehicle')
    .select('id')
    .in('policy_id', policyIds);

  const { data: drivers } = await supabase
    .from('driver')
    .select('id')
    .in('policy_id', policyIds);

  const locationIds = locations?.map(l => l.id) || [];
  const vehicleIds = vehicles?.map(v => v.id) || [];
  const driverIds = drivers?.map(d => d.id) || [];

  // Delete deepest nested entities first
  if (locationIds.length > 0) {
    const { data: dwellings } = await supabase
      .from('dwelling')
      .select('id')
      .in('location_id', locationIds);

    if (dwellings && dwellings.length > 0) {
      await supabase.from('dwelling_coverage').delete().in('dwelling_id', dwellings.map(d => d.id));
      await supabase.from('dwelling').delete().in('location_id', locationIds);
    }

    await supabase.from('enrichment_property_data').delete().in('location_id', locationIds);
  }

  if (vehicleIds.length > 0) {
    await supabase.from('vehicle_coverage').delete().in('vehicle_id', vehicleIds);
  }

  if (driverIds.length > 0) {
    await supabase.from('driving_record').delete().in('driver_id', driverIds);
    await supabase.from('enrichment_driver_license').delete().in('driver_id', driverIds);
  }

  // Delete mortgagees (references policy, dwelling, vehicle)
  await supabase.from('mortgagees').delete().in('policy_id', policyIds);

  // Delete direct policy children
  await supabase.from('location').delete().in('policy_id', policyIds);
  await supabase.from('vehicle').delete().in('policy_id', policyIds);
  await supabase.from('driver').delete().in('policy_id', policyIds);
  await supabase.from('dependents').delete().in('policy_id', policyIds);
  await supabase.from('additional_interests').delete().in('policy_id', policyIds);
  await supabase.from('documents').delete().in('policy_id', policyIds);
  await supabase.from('policy_forms').delete().in('policy_id', policyIds);
  await supabase.from('policy_renewals').delete().in('policy_id', policyIds);
  await supabase.from('policy_sources').delete().in('policy_id', policyIds);
  await supabase.from('monitoring').delete().in('policy_id', policyIds);
}

/**
 * Delete claims for a user
 */
async function deleteClaims(internalUserId: number): Promise<number> {
  // First get claim IDs to delete related documents
  const { data: claims } = await supabase
    .from('claims')
    .select('id')
    .eq('user_id', internalUserId);

  if (claims && claims.length > 0) {
    const claimIds = claims.map(c => c.id);
    // Delete documents linked to claims
    await supabase.from('documents').delete().in('claim_id', claimIds);
  }

  const { data, error } = await supabase
    .from('claims')
    .delete()
    .eq('user_id', internalUserId)
    .select('id');

  if (error) {
    console.error('❌ Error deleting claims:', error);
    throw new Error(`Failed to delete claims: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Delete policies for a user
 */
async function deletePolicies(internalUserId: number): Promise<number> {
  // Get policy IDs first
  const { data: policies } = await supabase
    .from('policies')
    .select('id')
    .eq('user_id', internalUserId);

  if (!policies || policies.length === 0) return 0;

  const policyIds = policies.map(p => p.id);

  // Delete nested entities
  await deletePolicyNestedEntities(policyIds);

  // Delete policies
  const { data, error } = await supabase
    .from('policies')
    .delete()
    .eq('user_id', internalUserId)
    .select('id');

  if (error) {
    console.error('❌ Error deleting policies:', error);
    throw new Error(`Failed to delete policies: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Delete quote-related records
 */
async function deleteQuotes(internalUserId: number): Promise<void> {
  // Get quote request IDs
  const { data: quoteRequests } = await supabase
    .from('quote_requests')
    .select('id')
    .eq('user_id', internalUserId);

  if (quoteRequests && quoteRequests.length > 0) {
    const quoteRequestIds = quoteRequests.map(q => q.id);
    await supabase.from('quotes').delete().in('quote_request_id', quoteRequestIds);
  }

  await supabase.from('quote_requests').delete().eq('user_id', internalUserId);
}

/**
 * Delete pull-related records
 */
async function deletePulls(internalUserId: number): Promise<void> {
  // Get pull IDs
  const { data: pulls } = await supabase
    .from('pull')
    .select('id')
    .eq('user_id', internalUserId);

  if (pulls && pulls.length > 0) {
    const pullIds = pulls.map(p => p.id);
    await supabase.from('api_syncs').delete().in('pull_id', pullIds);
    await supabase.from('pull_assignee').delete().in('pull_id', pullIds);
    await supabase.from('pull_funnel').delete().in('pull_id', pullIds);
    await supabase.from('policy_sources').delete().in('pull_id', pullIds);
  }

  await supabase.from('pull').delete().eq('user_id', internalUserId);
}

/**
 * Delete profile-related records
 */
async function deleteProfiles(internalUserId: number): Promise<void> {
  // Get profile IDs
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', internalUserId);

  if (profiles && profiles.length > 0) {
    const profileIds = profiles.map(p => p.id);
    await supabase.from('profile_members').delete().in('profile_id', profileIds);
  }

  // Also delete profile_members where user is a member
  await supabase.from('profile_members').delete().eq('member_user_id', internalUserId);

  await supabase.from('user_profiles').delete().eq('user_id', internalUserId);
}

/**
 * Delete miscellaneous user-related records
 */
async function deleteMiscUserRecords(internalUserId: number): Promise<void> {
  await supabase.from('rating_insights').delete().eq('user_id', internalUserId);
  await supabase.from('rating_requests').delete().eq('user_id', internalUserId);
  await supabase.from('user_rating_profiles').delete().eq('user_id', internalUserId);
}

/**
 * Delete the users record
 */
async function deleteUsersRecord(internalUserId: number): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', internalUserId);

  if (error) {
    console.error('❌ Error deleting users record:', error);
    throw new Error(`Failed to delete users record: ${error.message}`);
  }
}

/**
 * Delete the Supabase Auth user
 */
async function deleteAuthUser(authUserId: string): Promise<void> {
  const { error } = await supabase.auth.admin.deleteUser(authUserId);

  if (error) {
    console.error('❌ Error deleting auth user:', error);
    throw new Error(`Failed to delete auth user: ${error.message}`);
  }
}

/**
 * Log the deletion for audit purposes
 */
async function logDeletion(
  authUserId: string,
  email: string | undefined,
  deletedRecords: DeletionResult['deletedRecords'],
  ipAddress?: string
): Promise<void> {
  try {
    // Hash or partially mask the email for audit
    const emailHash = email
      ? email.substring(0, 3) + '***@' + email.split('@')[1]
      : null;

    await supabase.from('account_deletions').insert({
      auth_user_id: authUserId,
      email_hash: emailHash,
      deleted_records: deletedRecords,
      initiated_by: 'user',
      ip_address: ipAddress,
    });
  } catch (error) {
    // Non-fatal - log but don't fail the deletion
    console.warn('⚠️ Failed to log deletion:', error);
  }
}

/**
 * Main account deletion function
 * Deletes all user data across database, GCS, and Supabase Auth
 */
export async function deleteUserAccount(
  authUserId: string,
  internalUserId: number,
  userEmail?: string,
  ipAddress?: string
): Promise<DeletionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const deletedRecords: DeletionResult['deletedRecords'] = {
    gcsFiles: 0,
    userDocuments: 0,
    chatSessions: 0,
    conversations: 0,
    policies: 0,
    claims: 0,
    anonymizedPayments: 0,
    anonymizedAuditTrail: 0,
  };

  console.log(`\n🗑️ Starting account deletion for user: ${authUserId}`);
  console.log(`   Internal ID: ${internalUserId}`);

  try {
    // Phase 1: Anonymize records (audit_trail, payments)
    console.log('📋 Phase 1: Anonymizing compliance records...');
    deletedRecords.anonymizedAuditTrail = await anonymizeAuditTrail(internalUserId);
    deletedRecords.anonymizedPayments = await anonymizePayments(internalUserId);
    console.log(`   Anonymized ${deletedRecords.anonymizedAuditTrail} audit records`);
    console.log(`   Anonymized ${deletedRecords.anonymizedPayments} payment records`);

    // Phase 2: Delete GCS files and user_documents
    console.log('📋 Phase 2: Deleting GCS files and documents...');
    const docResult = await deleteUserDocuments(authUserId);
    deletedRecords.userDocuments = docResult.dbRecords;
    deletedRecords.gcsFiles = docResult.gcsFiles;
    errors.push(...docResult.errors);
    console.log(`   Deleted ${deletedRecords.gcsFiles} GCS files`);
    console.log(`   Deleted ${deletedRecords.userDocuments} document records`);

    // Phase 3: Delete conversation-related data
    console.log('📋 Phase 3: Deleting conversation data...');
    await deleteConversationEmbeddings(internalUserId);
    await deleteFeedback(internalUserId);
    await deleteChatFeedback(internalUserId);
    deletedRecords.conversations = await deleteConversations(internalUserId);
    deletedRecords.chatSessions = await deleteChatSessions(internalUserId);
    console.log(`   Deleted ${deletedRecords.conversations} conversations`);
    console.log(`   Deleted ${deletedRecords.chatSessions} chat sessions`);

    // Phase 4: Delete claims and policies
    console.log('📋 Phase 4: Deleting claims and policies...');
    deletedRecords.claims = await deleteClaims(internalUserId);
    deletedRecords.policies = await deletePolicies(internalUserId);
    console.log(`   Deleted ${deletedRecords.claims} claims`);
    console.log(`   Deleted ${deletedRecords.policies} policies`);

    // Phase 5: Delete remaining user data
    console.log('📋 Phase 5: Deleting remaining user data...');
    await deleteQuotes(internalUserId);
    await deletePulls(internalUserId);
    await deleteProfiles(internalUserId);
    await deleteMiscUserRecords(internalUserId);

    // Phase 6: Delete the users record
    console.log('📋 Phase 6: Deleting users record...');
    await deleteUsersRecord(internalUserId);

    // Phase 7: Delete the Supabase Auth user
    console.log('📋 Phase 7: Deleting Supabase Auth user...');
    await deleteAuthUser(authUserId);

    // Log the deletion
    await logDeletion(authUserId, userEmail, deletedRecords, ipAddress);

    const duration = Date.now() - startTime;
    console.log(`\n✅ Account deletion completed in ${duration}ms`);

    return {
      success: true,
      deletedRecords,
      errors,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`\n❌ Account deletion failed after ${duration}ms:`, errorMessage);
    errors.push(errorMessage);

    return {
      success: false,
      deletedRecords,
      errors,
      duration,
    };
  }
}

/**
 * Get user's internal ID from their auth ID
 */
export async function getInternalUserId(authUserId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('external_id', authUserId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}
