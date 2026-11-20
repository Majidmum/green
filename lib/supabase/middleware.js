import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { ROUTE_ROLES } from "@/lib/constants";

const AUTH_REQUIRED = ["/profile", "/orders", "/favorites", "/my-reviews", "/checkout"];

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() проверяет токен на сервере Supabase (в отличие от getSession()).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  };

  const protectedPrefix = Object.keys(ROUTE_ROLES).find((p) => pathname.startsWith(p));

  if (protectedPrefix) {
    if (!user) return redirectToLogin();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile?.is_active || !ROUTE_ROLES[protectedPrefix].includes(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  } else if (!user && AUTH_REQUIRED.some((p) => pathname.startsWith(p))) {
    return redirectToLogin();
  }

  return response;
}
