require('@testing-library/jest-dom');

// jsdom has no IntersectionObserver; the reveal hook needs one.
if (!global.IntersectionObserver) {
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom implements neither of these; the layout and reveal code calls both.
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
