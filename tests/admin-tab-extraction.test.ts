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
});
