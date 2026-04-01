import { describe, expect, it } from 'vitest';
import { T, getCurrentLang, setCurrentLang } from './i18n';

describe('i18n helpers', () => {
    it('returns spanish by default', () => {
        setCurrentLang('es');
        expect(getCurrentLang()).toBe('es');
        expect(T().appTitle).toBe('Sistema de Inventario IT');
    });

    it('switches to english when requested', () => {
        setCurrentLang('en');
        expect(T().logout).toBe('Sign out');
    });
});
