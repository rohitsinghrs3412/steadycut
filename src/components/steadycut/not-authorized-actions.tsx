"use client";

import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function NotAuthorizedActions() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button asChild className="w-full sm:w-auto">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
      <SignOutButton redirectUrl="/sign-in">
        <Button variant="outline" className="w-full sm:w-auto" type="button">
          Sign out
        </Button>
      </SignOutButton>
      <Button asChild variant="ghost" className="w-full sm:w-auto">
        <Link href="/sign-in">Use another account</Link>
      </Button>
    </div>
  );
}
