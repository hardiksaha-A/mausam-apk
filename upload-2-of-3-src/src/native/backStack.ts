/**
 * A tiny stack of "close me" handlers so the Android hardware Back button
 * closes the top-most sheet/overlay first, before it navigates or exits.
 */
type Handler = () => void;
const stack: Handler[] = [];

export function pushBackHandler(fn: Handler): () => void {
  stack.push(fn);
  return () => {
    const i = stack.lastIndexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Runs the top-most handler. Returns true if one existed. */
export function runTopBackHandler(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
}
