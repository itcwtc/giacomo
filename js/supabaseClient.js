import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const supabase = createClient(
  'https://vgtvobuxwdzkxnzdzfwp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndHZvYnV4d2R6a3huemR6ZndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2Nzk0ODEsImV4cCI6MjEwMDI1NTQ4MX0.RNyIYL4K8yvT0dnlcer-EdATLTpOlACyCKdA9igdTxU',
  {
    auth: {
      // Default (localStorage) is shared by every tab on this origin —
      // confirmed this session that logging into a second account in one
      // tab silently swaps the session a different, already-open tab reads
      // on its next auth check, including mid-session writes (settings
      // saves landed on the wrong account's medical_profiles row). Session
      // storage is scoped to this one tab only, so a second tab/window
      // gets its own independent session instead of overwriting this one.
      storage: window.sessionStorage,
    },
  }
);
 