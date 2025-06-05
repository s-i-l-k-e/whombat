"use client";
import { useSession, signIn } from "next-auth/react"

import { useRouter, useSearchParams } from "next/navigation";

import api from "@/app/api";

import { WhombatIcon } from "@/lib/components/icons";
import { Group, Input } from "@/lib/components/inputs/index";
import Info from "@/lib/components/ui/Info";
import Link from "@/lib/components/ui/Link";


export default function LoginForm() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
      <div className="mb-4 flex flex-col items-center gap-4 text-center text-7xl">
        <WhombatIcon width={128} height={128} />
        <span className="font-sans font-bold text-emerald-500 underline decoration-8">
          Whombat
        </span>
      </div>
      <p className="max-w-prose text-stone-500">
        Welcome back! Please sign in to continue.
      </p>
        <div className="mb-3">
          
          <Input type="submit" onClick={() => signIn("azure-ad", {callbackUrl:"/"})} value="Sign in" />
        </div>
      <Info className="w-80">
        <p>
          Don&apos;t have an account? Ask your administrator to create one for
          you.
        </p>
      </Info>
      {/* <Info className="w-80">
        <p>
          First time booting up Whombat? Click instead to create an account:
        </p>
        <div className="w-full flex flex-row justify-center">
          <Link mode="text" href="/first/" variant="info">
            Create account
          </Link>
        </div>
      </Info> */}
    </div>
  );
}
