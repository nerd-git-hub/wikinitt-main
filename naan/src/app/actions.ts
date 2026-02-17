"use server";

import { signIn } from "@/auth";

export async function googleLogin() {
    await signIn("google", { redirectTo: "/", callbackUrl: "/" });
}
