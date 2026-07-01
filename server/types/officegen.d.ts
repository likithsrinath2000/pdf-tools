// `officegen` ships no type declarations. It's used with a minimal, dynamic
// API surface (create(...).on/generate/paragraph/etc.), so a permissive
// module declaration is sufficient to satisfy the type checker.
declare module "officegen" {
  const officegen: any;
  export default officegen;
}
