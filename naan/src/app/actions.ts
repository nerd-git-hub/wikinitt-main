"use server";

import { signIn } from "@/auth";

export async function googleLogin() {
    console.log("Attempting Google Login via Server Action");
    await signIn("google", { redirectTo: "/", callbackUrl: "/" });
}
