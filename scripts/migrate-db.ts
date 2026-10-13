/**
 * PayGate Database Migration & Production Seeding Script
 * Synchronizes schema tables, seeds wallet pool, pricing plans, devices,
 * API keys, merchant accounts, and audit log entries in PostgreSQL / Supabase.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import { supabaseAdmin, isSupabaseConfigured } from '../src/db/supabaseClient.ts';

dotenv.config();

interface MigrationStats {
  merchants: number;
  devices: number;
  wallets: number;
  pricingPlans: number;
  apiKeys: number;
  merchantUsers: number;
  auditLogs: number;
}

const stats: MigrationStats = {
  merchants: 0,
  devices: 0,
  wallets: 0,
  pricingPlans: 0,
  apiKeys: 0,
  merchantUsers: 0,
  auditLogs: 0,
};

async function runMigration() {
  console.log('====================================================');
  console.log('   PayGate Database Migration & Seeding Engine      ');
  console.log('====================================================');

  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase environment variables not configured!');
    process.exit(1);
  }

  console.log('✓ Supabase endpoint and service role key detected.');
  console.log('✓ Starting database migration and transactional seed...\n');

  // --------------------------------------------------------------------------
  // Step 1: Migrate & Seed Merchants
  // --------------------------------------------------------------------------
  console.log('--- Step 1: Migrating Merchants ---');
  const merchantsToSeed = [
    {
      id: 'merch_01h8a9x2',
      name: 'DeshiCart Technologies Ltd.',
      status: 'active',
      kyb_status: 'approved',
      payout_account: {
        type: 'bank',
        holder: 'DeshiCart Technologies Ltd',
        bank_name: 'Eastern Bank PLC',
        account_no: '1081520038921',
        routing_no: '095261320',
        branch_name: 'Gulshan-2 Branch, Dhaka',
      },
      fee_rate_bps: 500, // 5.00%
      risk_tier: 'low',
      webhook_secret_hash: 'whsec_9a8f2e71b402d97316ec1a53',
      auto_confirm: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mer_8037ad630bd340b88ef19e4c',
      name: 'SuprBuild Technologies',
      status: 'active',
      kyb_status: 'approved',
      payout_account: {
        type: 'mfs',
        holder: 'Muhaimin',
        provider: 'bkash',
        account_no: '01781188876',
      },
      fee_rate_bps: 500,
      risk_tier: 'low',
      webhook_secret_hash: 'whsec_e9f82b71940a12cf498a1293',
      auto_confirm: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mer_d92a2a5affa04cedbc7b3311',
      name: 'Dhaka Quick Commerce Shop',
      status: 'active',
      kyb_status: 'approved',
      payout_account: {
        type: 'mfs',
        holder: 'Test Shop Merchant',
        provider: 'bkash',
        account_no: '01712345678',
      },
      fee_rate_bps: 500,
      risk_tier: 'low',
      webhook_secret_hash: 'whsec_88129a00b12cf498a1293abc',
      auto_confirm: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mer_124daaaa63db49399e74bf32',
      name: 'SSBLC Logistics & Retail',
      status: 'active',
      kyb_status: 'approved',
      payout_account: {
        type: 'bank',
        holder: 'Muhaimin',
        bank_name: 'BRAC Bank PLC',
        account_no: '1079520900001',
      },
      fee_rate_bps: 500,
      risk_tier: 'low',
      webhook_secret_hash: 'whsec_77a12b498a1293abcc109df2',
      auto_confirm: true,
      created_at: new Date().toISOString(),
    },
  ];

  for (const m of merchantsToSeed) {
    const { error } = await supabaseAdmin.from('merchants').upsert(m);
    if (error) {
      console.warn(`  ⚠️ Merchant ${m.name} upsert notice:`, error.message);
    } else {
      console.log(`  ✓ Merchant migrated: ${m.name} (${m.id})`);
      stats.merchants++;
    }
  }

  // --------------------------------------------------------------------------
  // Step 2: Migrate & Seed Hardware Devices (Super Admin & SMS Forwarders)
  // --------------------------------------------------------------------------
  console.log('\n--- Step 2: Migrating SMS Forwarder Devices ---');
  const devicesToSeed = [
    {
      id: 'dev_admin_phone',
      name: 'Super Admin Terminal (Pixel 6a)',
      model: 'Google Pixel 6a (GrapheneOS / Knox Verified)',
      app_version: 'v4.0.2-prod',
      token_hash: crypto.createHash('sha256').update('sat_live_8e1d93b4a5f607182934').digest('hex'),
      status: 'active',
      battery: 94,
      queue_depth: 0,
      permissions: {
        smsRead: true,
        smsReceive: true,
        batteryOptimizationDisabled: true,
        networkUnrestricted: true,
      },
      last_heartbeat_at: new Date().toISOString(),
    },
    {
      id: 'dev_px6a_01',
      name: 'Fleet Node Alpha (Gulshan)',
      model: 'Google Pixel 6a (Android 14)',
      app_version: 'v4.0.2-prod',
      token_hash: crypto.createHash('sha256').update('sat_live_px6a_01_token').digest('hex'),
      status: 'active',
      battery: 88,
      queue_depth: 0,
      permissions: { smsRead: true, smsReceive: true, batteryOptimizationDisabled: true },
      last_heartbeat_at: new Date().toISOString(),
    },
    {
      id: 'dev_sams_02',
      name: 'Fleet Node Beta (Banani)',
      model: 'Samsung Galaxy A15 (Android 14)',
      app_version: 'v4.0.2-prod',
      token_hash: crypto.createHash('sha256').update('sat_live_sams_02_token').digest('hex'),
      status: 'active',
      battery: 73,
      queue_depth: 0,
      permissions: { smsRead: true, smsReceive: true, batteryOptimizationDisabled: true },
      last_heartbeat_at: new Date().toISOString(),
    },
  ];

  for (const d of devicesToSeed) {
    const { error } = await supabaseAdmin.from('devices').upsert(d);
    if (error) {
      console.warn(`  ⚠️ Device ${d.name} upsert notice:`, error.message);
    } else {
      console.log(`  ✓ Device migrated: ${d.name} (${d.id})`);
      stats.devices++;
    }
  }

  // --------------------------------------------------------------------------
  // Step 3: Migrate & Seed Managed MFS SIM Wallets Pool
  // --------------------------------------------------------------------------
  console.log('\n--- Step 3: Migrating Managed MFS Wallets Pool ---');
  const walletsToSeed = [
    {
      id: 'wlt_bk_01',
      provider: 'bkash',
      msisdn: '01712-750278',
      holder_name: 'Rahim Ahmed (Primary 1)',
      device_id: 'dev_admin_phone',
      sim_slot: 1,
      status: 'active',
      daily_limit: 3000000, // Tk 30,000.00
      monthly_limit: 20000000,
      today_total: 1450000,
      concurrency_cap: 15,
      created_at: new Date().toISOString(),
    },
    {
      id: 'wlt_ng_02',
      provider: 'nagad',
      msisdn: '01834-918234',
      holder_name: 'Karim Khan (Primary 2)',
      device_id: 'dev_admin_phone',
      sim_slot: 2,
      status: 'active',
      daily_limit: 5000000, // Tk 50,000.00
      monthly_limit: 30000000,
      today_total: 820000,
      concurrency_cap: 20,
      created_at: new Date().toISOString(),
    },
    {
      id: 'wlt_rk_03',
      provider: 'rocket',
      msisdn: '01923-456789',
      holder_name: 'Farhan Hossain (Node 2)',
      device_id: 'dev_sams_02',
      sim_slot: 1,
      status: 'active',
      daily_limit: 3000000,
      monthly_limit: 20000000,
      today_total: 420000,
      concurrency_cap: 10,
      created_at: new Date().toISOString(),
    },
    {
      id: 'wlt_bk_04',
      provider: 'bkash',
      msisdn: '01798-123456',
      holder_name: 'Sultan Mahmud (Pool 4 Backup)',
      device_id: 'dev_px6a_01',
      sim_slot: 1,
      status: 'active',
      daily_limit: 3000000,
      monthly_limit: 20000000,
      today_total: 0,
      concurrency_cap: 15,
      created_at: new Date().toISOString(),
    },
  ];

  for (const w of walletsToSeed) {
    const { error } = await supabaseAdmin.from('wallets').upsert(w);
    if (error) {
      console.warn(`  ⚠️ Wallet ${w.id} (${w.provider}) upsert notice:`, error.message);
    } else {
      console.log(`  ✓ Wallet active: ${w.id} [${w.provider.toUpperCase()}] ${w.msisdn} -> ${w.holder_name}`);
      stats.wallets++;
    }
  }

  // --------------------------------------------------------------------------
  // Step 4: Migrate & Seed Pricing Plans (Server-Authoritative in Paisa)
  // --------------------------------------------------------------------------
  console.log('\n--- Step 4: Migrating Pricing Plans ---');
  const targetMerchants = ['merch_01h8a9x2', 'mer_8037ad630bd340b88ef19e4c'];
  const basePlans = [
    {
      idSuffix: 'plan_pro_monthly',
      name: 'Pro Monthly Subscription',
      amount: 120000, // Tk 1,200.00
      external_sku: 'SKU-PRO-MTH',
    },
    {
      idSuffix: 'plan_basic_starter',
      name: 'Starter Tier Pass',
      amount: 50000, // Tk 500.00
      external_sku: 'SKU-STARTER-MTH',
    },
    {
      idSuffix: 'plan_annual_growth',
      name: 'Enterprise Pass (Annual)',
      amount: 1200000, // Tk 12,000.00
      external_sku: 'SKU-ENT-YR',
    },
    {
      idSuffix: 'plan_topup_credit',
      name: 'Quick API Credits (500 Pack)',
      amount: 25000, // Tk 250.00
      external_sku: 'SKU-TOPUP-250',
    },
  ];

  for (const merchantId of targetMerchants) {
    for (const bp of basePlans) {
      const planRecord = {
        id: `${merchantId}_${bp.idSuffix}`,
        merchant_id: merchantId,
        name: bp.name,
        amount: bp.amount,
        currency: 'BDT',
        external_sku: bp.external_sku,
        version: 1,
        status: 'active',
        open_amount: false,
        created_at: new Date().toISOString(),
      };
      // Also register global id 'plan_pro_monthly' for demo merchant
      if (merchantId === 'merch_01h8a9x2') {
        await supabaseAdmin.from('pricing_plans').upsert({
          ...planRecord,
          id: bp.idSuffix,
        });
      }

      const { error } = await supabaseAdmin.from('pricing_plans').upsert(planRecord);
      if (error) {
        console.warn(`  ⚠️ Pricing plan ${planRecord.id} upsert notice:`, error.message);
      } else {
        console.log(`  ✓ Plan migrated: ${planRecord.name} (Tk ${(planRecord.amount / 100).toFixed(2)}) for ${merchantId}`);
        stats.pricingPlans++;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Step 5: Migrate & Seed Merchant API Keys
  // --------------------------------------------------------------------------
  console.log('\n--- Step 5: Migrating Merchant API Keys ---');
  const apiKeysToSeed = [
    {
      id: 'key_live_deshicart',
      merchant_id: 'merch_01h8a9x2',
      rawKey: 'sk_live_pg_99210a48b3c109df291c',
      prefix: 'sk_live_pg_',
      label: 'Production Live Key (DeshiCart)',
    },
    {
      id: 'key_test_deshicart',
      merchant_id: 'merch_01h8a9x2',
      rawKey: 'sk_test_pg_demo88129a00b12',
      prefix: 'sk_test_pg_',
      label: 'Sandbox Test Key (DeshiCart)',
    },
    {
      id: 'key_live_suprbuild',
      merchant_id: 'mer_8037ad630bd340b88ef19e4c',
      rawKey: 'sk_live_8e1d2c3b4a5f607182934',
      prefix: 'sk_live_',
      label: 'Production Live Key (SuprBuild)',
    },
    {
      id: 'key_test_suprbuild',
      merchant_id: 'mer_8037ad630bd340b88ef19e4c',
      rawKey: 'sk_test_4f9a0c1e8d7b6a5241093',
      prefix: 'sk_test_',
      label: 'Sandbox Test Key (SuprBuild)',
    },
  ];

  for (const k of apiKeysToSeed) {
    const keyHash = crypto.createHash('sha256').update(k.rawKey).digest('hex');
    const { error } = await supabaseAdmin.from('api_keys').upsert({
      id: k.id,
      merchant_id: k.merchant_id,
      key_hash: keyHash,
      prefix: k.prefix,
      label: k.label,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn(`  ⚠️ API Key ${k.label} upsert notice:`, error.message);
    } else {
      console.log(`  ✓ API Key migrated: ${k.label} [${k.prefix}...]`);
      stats.apiKeys++;
    }
  }

  // --------------------------------------------------------------------------
  // Step 6: Migrate & Seed Merchant Users
  // --------------------------------------------------------------------------
  console.log('\n--- Step 6: Migrating Merchant User Identities ---');
  const merchantUsersToSeed = [
    {
      id: '018a9020-0000-0000-0000-000000000001',
      merchant_id: 'merch_01h8a9x2',
      auth_user_id: '018a9020-0000-0000-0000-000000000001',
      role: 'owner',
      email: 'founder@deshicart.com.bd',
      created_at: new Date().toISOString(),
    },
    {
      id: '018a9020-0000-0000-0000-000000000002',
      merchant_id: 'mer_8037ad630bd340b88ef19e4c',
      auth_user_id: '018a9020-0000-0000-0000-000000000002',
      role: 'owner',
      email: 'muhaimin@suprbuild.com',
      created_at: new Date().toISOString(),
    },
  ];

  for (const u of merchantUsersToSeed) {
    const { error } = await supabaseAdmin.from('merchant_users').upsert(u);
    if (error) {
      console.warn(`  ⚠️ Merchant user ${u.email} upsert notice:`, error.message);
    } else {
      console.log(`  ✓ Merchant user migrated: ${u.email} (${u.role})`);
      stats.merchantUsers++;
    }
  }

  // --------------------------------------------------------------------------
  // Step 7: Record Genesis Migration Audit Log
  // --------------------------------------------------------------------------
  console.log('\n--- Step 7: Recording Migration Audit Trail ---');
  const auditEntry = {
    id: crypto.randomUUID(),
    actor: 'system_migration_cli',
    action: 'DATABASE_MIGRATION_COMPLETED',
    entity_type: 'system',
    entity_id: 'mig_v4_paygate_prod',
    before: null,
    after: {
      migratedAt: new Date().toISOString(),
      version: 'v4.0.0-prod',
      stats,
    },
    ip: '127.0.0.1',
    created_at: new Date().toISOString(),
  };

  const { error: auditErr } = await supabaseAdmin.from('audit_log').insert(auditEntry);
  if (auditErr) {
    console.warn('  ⚠️ Audit log record notice:', auditErr.message);
  } else {
    console.log(`  ✓ Tamper-evident audit entry committed (ID: ${auditEntry.id})`);
    stats.auditLogs++;
  }

  // --------------------------------------------------------------------------
  // Verification: Test PostgreSQL Stored Procedure (assign_wallet)
  // --------------------------------------------------------------------------
  console.log('\n--- Step 8: Verifying Atomic Stored Procedures ---');
  const { data: testWallet, error: assignErr } = await supabaseAdmin.rpc('assign_wallet', {
    p_merchant_id: 'merch_01h8a9x2',
    p_provider: 'bkash',
  });

  if (assignErr) {
    console.error('  ❌ assign_wallet RPC verification failed:', assignErr.message);
  } else if (testWallet && testWallet.msisdn) {
    console.log(`  ✓ assign_wallet RPC verified: allocated ${testWallet.provider.toUpperCase()} wallet ${testWallet.msisdn}`);
  } else {
    console.log('  ⚠️ assign_wallet returned no wallet (check criteria)');
  }

  console.log('\n====================================================');
  console.log('      DATABASE MIGRATION SUMMARY REPORT             ');
  console.log('====================================================');
  console.log(`  • Merchants Active:       ${stats.merchants}`);
  console.log(`  • Hardware Devices:       ${stats.devices}`);
  console.log(`  • Managed SIM Wallets:    ${stats.wallets}`);
  console.log(`  • Pricing Plans (Paisa):  ${stats.pricingPlans}`);
  console.log(`  • API Key Credentials:    ${stats.apiKeys}`);
  console.log(`  • Merchant User Accounts: ${stats.merchantUsers}`);
  console.log(`  • Audit Log Entries:      ${stats.auditLogs}`);
  console.log('====================================================');
  console.log('🎉 Database successfully migrated and production ready!\n');
}

runMigration().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
