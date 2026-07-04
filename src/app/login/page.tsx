import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 font-serif text-4xl font-medium tracking-tight"
      >
        <Image src="/logo-mark.png" alt="" width={36} height={41} className="h-9 w-auto" />
        Reciply
      </Link>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
