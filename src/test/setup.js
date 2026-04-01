import '@testing-library/jest-dom/vitest';

if (!window.matchMedia) {
    window.matchMedia = () => ({
        matches: false,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return false; },
    });
}

if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:test';
}
