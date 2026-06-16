import { NextAuthOptions } from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import CredentialsProvider from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";

/**
 * NextAuth Configuration - Refined & Robust Setup (v2)
 * 
 * - Integration: Supabase (via SupabaseAdapter)
 * - Provider: Kakao (with robust mapping & fallback email)
 * - Provider: Credentials (for Staff sub-accounts)
 * - Redirect Loop Prevention: Explicit pages configuration
 * - Debugging: Detailed login callback logging
 */
export const authOptions: NextAuthOptions = {
  // 1. Database Persistence (Supabase)
  // Ensure tables exist in the 'next_auth' schema and it is exposed in Supabase settings.
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),

  // 2. Session Strategy
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // 3. Authentication Providers
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || "",
      clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      
      /**
       * Robust Profile Mapping
       * 카카오에서 이메일을 제공하지 않더라도 DB 에러가 발생하지 않도록 방어 로직을 추가했습니다.
       */
      profile(profile) {
        // 이메일이 없는 경우 고유 ID를 기반으로 대체 이메일을 생성합니다.
        const userEmail = profile.kakao_account?.email || `${profile.id}@kakao.user`;
        const userName = profile.kakao_account?.profile?.nickname || profile.properties?.nickname || "카카오 사용자";
        const userImage = profile.kakao_account?.profile?.profile_image_url || profile.properties?.profile_image || "";

        console.log("✅ 카카오 프로필 매핑 성공:", { id: profile.id, email: userEmail });

        return {
          id: profile.id.toString(),
          name: userName,
          email: userEmail,
          image: userImage,
        };
      },
    }),
    CredentialsProvider({
      id: "staff-login",
      name: "직원 로그인",
      credentials: {
        phone: { label: "휴대폰 번호 (- 제외)", type: "text" },
        password: { label: "비밀번호", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) return null;
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          const { data, error } = await supabase
            .from("staff_accounts")
            .select("*")
            .eq("phone", credentials.phone.replace(/-/g, ""))
            .single();

          if (error || !data) return null;

          if (data.is_blocked) {
            throw new Error("보안 정책에 의해 해당 계정의 접속이 차단되었습니다.");
          }

          if (data.password === credentials.password) {
            return {
              id: data.id,
              name: data.name,
              email: `staff_${data.phone}@bareun.app`, // fake email to satisfy NextAuth
              // @ts-ignore
              role: "staff",
              parent_email: data.parent_email,
              clinic_name: data.clinic_name
            };
          }
          return null;
        } catch (e) {
          console.error("Staff auth error:", e);
          return null;
        }
      }
    }),
    CredentialsProvider({
      id: "master-login",
      name: "마스터 로그인",
      credentials: {
        password: { label: "마스터 비밀번호", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.password) return null;
        
        const expectedPassword = process.env.MASTER_PASSWORD || "master1234!";
        if (credentials.password === expectedPassword) {
          const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
          return {
            id: "master",
            name: "최고 관리자",
            email: masterEmail,
            // @ts-ignore
            role: "master"
          };
        }
        return null;
      }
    })
  ],

  // 4. Callbacks for Debugging & Sync
  callbacks: {
    /**
     * SignIn Callback
     * 로그인 시도 시 데이터를 검증하고 에러가 발생하면 터미널에 상세 기록을 남깁니다.
     */
    async signIn({ user, account, profile }) {
      try {
        console.log("🚀 로그인 시도 시작:", { provider: account?.provider, email: user.email });
        
        if (!user.email) {
          console.error("🔥 로그인 실패: 이메일 정보가 유실되었습니다.");
          return false;
        }

        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          
          await supabase.from('user_activities').insert([{
            user_email: user.email,
            // @ts-ignore
            user_role: user.role || 'director',
            action_type: 'login',
            path: '/',
            metadata: { provider: account?.provider },
            created_at: new Date().toISOString()
          }]);
        } catch (e) {
          console.error("Failed to log login activity:", e);
        }

        return true;
      } catch (error) {
        console.error("🔥 로그인 콜백 에러 발생:", error);
        console.error("데이터 상태:", { user, account, profile });
        return false;
      }
    },

    /**
     * JWT Callback
     * 세션 토큰 정보를 안전하게 캐싱합니다.
     */
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        // @ts-ignore
        if (user.role) {
          // @ts-ignore
          token.role = user.role;
          // @ts-ignore
          token.parent_email = user.parent_email;
          // @ts-ignore
          token.clinic_name = user.clinic_name;
        }
      }
      return token;
    },

    /**
     * Session Callback
     * 프론트엔드 useSession()에서 사용할 수 있도록 데이터를 동기화합니다.
     */
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
        // @ts-ignore
        session.user.role = token.role || "director";
        // @ts-ignore
        session.user.parent_email = token.parent_email;

        // Fetch permissions from Supabase (only if not staff)
        // @ts-ignore
        if (session.user.role !== "staff") {
          try {
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data } = await supabase
              .from("user_permissions")
              .select("approval_status, approved_category, approved_categories, selected_emr, real_name, clinic_name, age, phone")
              .eq("user_email", token.email?.toLowerCase())
              .single();

            if (data) {
              // @ts-ignore
              session.user.approvalStatus = data.approval_status;
              // @ts-ignore
              session.user.approvedCategories = data.approved_categories || (data.approved_category ? [data.approved_category] : []);
              // @ts-ignore
              session.user.selectedEmr = data.selected_emr;
              // @ts-ignore
              session.user.realName = data.real_name;
              // @ts-ignore
              session.user.clinicName = data.clinic_name;
              // @ts-ignore
              session.user.age = data.age;
              // @ts-ignore
              session.user.phone = data.phone;
            } else {
              // @ts-ignore
              session.user.approvalStatus = 'pending';
              // @ts-ignore
              session.user.approvedCategories = [];
            }
          } catch (e) {
            console.error("Session permission fetch error:", e);
          }
        } else {
          // @ts-ignore
          session.user.approvalStatus = 'approved';
          // @ts-ignore
          session.user.approvedCategories = ['treatment']; // Staff only gets treatment videos by default
          // @ts-ignore
          session.user.clinicName = token.clinic_name;
          // @ts-ignore
          session.user.realName = token.name;
        }
      }
      return session;
    },
  },

  // 5. Security & UI Configuration
  pages: {
    signIn: "/", // 무한 리다이렉트 방지를 위해 랜딩 페이지로 고정
    error: "/",  // 에러 발생 시에도 초기 화면으로 안전하게 복귀
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
