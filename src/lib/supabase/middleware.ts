import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  const { url, anonKey, isConfigured } = getSupabasePublicEnv();

  if (!isConfigured || !url || !anonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub as string | undefined;
  const path = request.nextUrl.pathname;

  const needsSession = path.startsWith("/painel") || path.startsWith("/operador");
  const isAuth = path.startsWith("/entrar") || path.startsWith("/cadastro");
  const isAuthCallback = path.startsWith("/auth/callback");

  if (needsSession && !sub && !isAuthCallback) {
    const u = request.nextUrl.clone();
    u.pathname = "/entrar";
    u.searchParams.set("next", path);
    return NextResponse.redirect(u);
  }

  if (sub && isAuth) {
    const u = request.nextUrl.clone();
    u.pathname = "/painel";
    return NextResponse.redirect(u);
  }

  return supabaseResponse;
}
