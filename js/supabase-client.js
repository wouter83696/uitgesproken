// Supabase configuratie
// Vul hier jouw gegevens in uit Supabase → Project Settings → Data API

const SUPABASE_URL  = 'https://gjquwqepisbpphgnzlcs.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcXV3cWVwaXNicHBoZ256bGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzU3OTAsImV4cCI6MjA5MDI1MTc5MH0.NFcWbQY_ES4SotPW2cNGFmJl4vpI0m-ejDPPlHj83Gs';

function resolveParentSupabase() {
  if (typeof window === 'undefined') return null;
  try {
    if (window.parent && window.parent !== window && window.parent.UITGESPROKEN_DASHBOARD_SUPABASE) {
      return window.parent.UITGESPROKEN_DASHBOARD_SUPABASE;
    }
    if (window.parent && window.parent !== window && window.parent._supa) {
      return window.parent._supa;
    }
  } catch (_error) {}
  return null;
}

function resolveWindowSupabase() {
  if (typeof window === 'undefined') return null;
  if (window._supa) return window._supa;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return null;
}

async function createStandaloneSupabase() {
  const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  if (!mod || typeof mod.createClient !== 'function') {
    throw new Error('Supabase client kon niet worden geladen');
  }
  return mod.createClient(SUPABASE_URL, SUPABASE_ANON);
}

let standaloneSupabasePromise = null;

function getSupabase() {
  const existing = resolveParentSupabase() || resolveWindowSupabase();
  if (existing) return Promise.resolve(existing);
  if (!standaloneSupabasePromise) standaloneSupabasePromise = createStandaloneSupabase();
  return standaloneSupabasePromise;
}

function createLazyQuery(tableArgs) {
  const calls = [];
  const proxy = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') {
        return function(resolve, reject) {
          return getSupabase().then(function(client){
            let query = client.from.apply(client, tableArgs);
            calls.forEach(function(call){
              query = query[call.prop].apply(query, call.args);
            });
            return query;
          }).then(resolve, reject);
        };
      }
      return function() {
        calls.push({ prop: prop, args: arguments });
        return proxy;
      };
    }
  });
  return proxy;
}

function createLazySupabaseProxy() {
  return new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      if (prop === 'from') {
        return function() {
          return createLazyQuery(arguments);
        };
      }
      return new Proxy({}, {
        get(_nestedTarget, nestedProp) {
          return function() {
            const args = arguments;
            return getSupabase().then(function(client){
              return client[prop][nestedProp].apply(client[prop], args);
            });
          };
        }
      });
    }
  });
}

export const supabase = createLazySupabaseProxy();

export async function ensureOwnProfile(user) {
  const authUser = user || (await supabase.auth.getUser()).data.user;
  if (!authUser) return { data: null, error: new Error('No authenticated user') };
  return supabase
    .from('profiles')
    .upsert({ id: authUser.id }, { onConflict: 'id' });
}
