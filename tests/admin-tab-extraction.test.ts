import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectPath = (...parts: string[]) => resolve(process.cwd(), ...parts);

describe('phase 02 tab extraction source files', () => {
  it('creates standalone accounts and players tab components under src/components/admin', () => {
    const accountsTabPath = projectPath('src/components/admin/accounts-tab.tsx');
    const playersTabPath = projectPath('src/components/admin/players-tab.tsx');

    expect(existsSync(accountsTabPath)).toBe(true);
    expect(existsSync(playersTabPath)).toBe(true);

    const accountsSource = readFileSync(accountsTabPath, 'utf8');
    const playersSource = readFileSync(playersTabPath, 'utf8');

    expect(accountsSource).toContain('Manage account-based access for admin operations.');
    expect(accountsSource).toContain('Create Account');
    expect(accountsSource).toContain('Password changed.');

    expect(playersSource).toContain('Manage club roster with compact cards');
    expect(playersSource).toContain('Add to Roster');
    expect(playersSource).toContain('Hide Advanced');
    expect(playersSource).toContain('Upload Avatar');
  });

  it('creates standalone club access and automation tab components under src/components/admin', () => {
    const clubAccessTabPath = projectPath('src/components/admin/club-access-tab.tsx');
    const automationTabPath = projectPath('src/components/admin/automation-tab.tsx');

    expect(existsSync(clubAccessTabPath)).toBe(true);
    expect(existsSync(automationTabPath)).toBe(true);

    const clubAccessSource = readFileSync(clubAccessTabPath, 'utf8');
    const automationSource = readFileSync(automationTabPath, 'utf8');

    expect(clubAccessSource).toContain('Rotate Token');
    expect(clubAccessSource).toContain('Copy Invite Link');
    expect(clubAccessSource).toContain('Current Access Link');

    expect(automationSource).toContain('Receipt Ingestion');
    expect(automationSource).toContain('Run Ingestion Now');
    expect(automationSource).toContain('Ingestion Run History');
    expect(automationSource).toContain('Parse Failures');
  });

  it('creates standalone splitwise and emails tab components under src/components/admin', () => {
    const splitwiseTabPath = projectPath('src/components/admin/splitwise-tab.tsx');
    const emailsTabPath = projectPath('src/components/admin/emails-tab.tsx');

    expect(existsSync(splitwiseTabPath)).toBe(true);
    expect(existsSync(emailsTabPath)).toBe(true);

    const splitwiseSource = readFileSync(splitwiseTabPath, 'utf8');
    const emailsSource = readFileSync(emailsTabPath, 'utf8');

    expect(splitwiseSource).toContain('Splitwise Run History');
    expect(splitwiseSource).toContain('Group Tools');
    expect(splitwiseSource).toContain('Splitwise Records');
    expect(splitwiseSource).toContain('/api/admin/splitwise/run-history');
    expect(splitwiseSource).toContain('/api/admin/splitwise/expenses');

    expect(emailsSource).toContain('Fetched Email Content');
    expect(emailsSource).toContain('Load Email Content');
    expect(emailsSource).toContain('Email Bodies');
    expect(emailsSource).toContain('Re-run Log');
    expect(emailsSource).toContain('buildSingleEmailRerunPayload');
  });
});

describe('phase 03 shell reduction source contract', () => {
  const pagePath = projectPath('src/app/admin/page.tsx');

  it('keeps local activeTab, eager tabs, and visited-tab state in the admin page shell', () => {
    const pageSource = readFileSync(pagePath, 'utf8');

    expect(pageSource).toContain("useState<TabKey>(\"players\")");
    expect(pageSource).toContain('const eagerMountedTabs: TabKey[] = ["players", "club", "automation", "splitwise"]');
    expect(pageSource).toContain('useState<Record<TabKey, boolean>>({');
    expect(pageSource).toContain('accounts: false');
    expect(pageSource).toContain('players: true');
    expect(pageSource).toContain('club: false');
    expect(pageSource).toContain('automation: false');
    expect(pageSource).toContain('emails: false');
    expect(pageSource).toContain('splitwise: true');
  });

  it('does not introduce query-param or router-based tab state', () => {
    const pageSource = readFileSync(pagePath, 'utf8');

    expect(pageSource).not.toContain('useSearchParams');
    expect(pageSource).not.toContain('searchParams');
    expect(pageSource).not.toContain('router.');
    expect(pageSource).not.toContain('useRouter');
  });

  it('imports the shared tab shell helper instead of keeping duplicated tab button and panel blocks inline', () => {
    const pageSource = readFileSync(pagePath, 'utf8');

    expect(pageSource).toContain("from '../../components/admin/admin-tab-shell'");
    expect(pageSource).toContain('renderAdminTabNav(');
    expect(pageSource).toContain('renderAdminTabPanels(');
    expect(pageSource).not.toContain('onClick={() => setActiveTab("accounts")}');
    expect(pageSource).not.toContain('<AccountsTab />');
    expect(pageSource).not.toContain('<SplitwiseTab />');
  });
});
