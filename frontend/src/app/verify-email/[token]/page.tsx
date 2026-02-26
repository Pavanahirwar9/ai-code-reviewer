"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Code2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

export default function VerifyEmailPage() {
    const params = useParams();
    const router = useRouter();
    const token = params?.token as string;

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Verification token is missing.");
            return;
        }

        (async () => {
            try {
                const res = await api.verifyEmail(token);
                if (res.success) {
                    // Store JWT so the user is immediately logged in
                    if (res.data?.token && typeof window !== "undefined") {
                        localStorage.setItem("token", res.data.token);
                        if (res.data.user) {
                            localStorage.setItem("user", JSON.stringify(res.data.user));
                        }
                    }
                    setStatus("success");
                    setMessage(res.message || "Email verified successfully!");
                    // Redirect to dashboard after a short delay
                    setTimeout(() => router.push("/dashboard"), 2500);
                } else {
                    setStatus("error");
                    setMessage(res.error || "Invalid or expired verification link.");
                }
            } catch {
                setStatus("error");
                setMessage("Something went wrong. Please try again.");
            }
        })();
    }, [token, router]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                            <Code2 className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <span className="text-2xl font-bold text-foreground">CodeLens AI</span>
                    </Link>
                </div>

                <Card className="border-border bg-card shadow-lg">
                    <CardHeader className="space-y-1 text-center">
                        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                            {status === "loading" && <Loader2 className="h-7 w-7 text-primary animate-spin" />}
                            {status === "success" && <CheckCircle2 className="h-7 w-7 text-green-500" />}
                            {status === "error" && <XCircle className="h-7 w-7 text-destructive" />}
                        </div>

                        <CardTitle className="text-2xl font-bold text-card-foreground">
                            {status === "loading" && "Verifying your email..."}
                            {status === "success" && "Email verified!"}
                            {status === "error" && "Verification failed"}
                        </CardTitle>

                        <CardDescription className="text-base">
                            {status === "loading" && "Please wait while we confirm your email address."}
                            {status === "success" && "Your account is now active. Redirecting to your dashboard..."}
                            {status === "error" && message}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {status === "success" && (
                            <div className="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-600 dark:text-green-400 text-center">
                                Welcome to CodeLens AI! Taking you to your dashboard...
                            </div>
                        )}

                        {status === "error" && (
                            <div className="space-y-3">
                                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive text-center">
                                    {message}
                                </div>
                                <p className="text-center text-sm text-muted-foreground">
                                    Need a new link?{" "}
                                    <Link href="/register" className="text-primary hover:underline font-medium">
                                        Register again
                                    </Link>{" "}
                                    or{" "}
                                    <Link href="/login" className="text-primary hover:underline font-medium">
                                        log in
                                    </Link>
                                    {" "}to request a resend.
                                </p>
                            </div>
                        )}

                        {status !== "loading" && (
                            <div className="text-center">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(status === "success" ? "/dashboard" : "/login")}
                                >
                                    {status === "success" ? "Go to Dashboard" : "Back to Login"}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
