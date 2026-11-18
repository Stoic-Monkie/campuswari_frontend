/** Length in Unicode characters (code points), which is how the API counts. JS `.length` overcounts emoji. */
export function cpLength(text: string): number {
  let n = 0;
  for (const _ of text) {
    void _;
    n++;
  }
  return n;
}
