"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code2, Mail, AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const validateEmail = (val: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email) {
            setError("Please enter your email address.");
            return;
        }
        if (!validateEmail(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        setIsLoading(true);
        try {
            await api.forgotPassword(email.trim().toLowerCase());
            // Always show success to prevent email enumeration
            setSubmitted(true);
        } catch {
            setSubmitted(true); // still show success
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary-foreground/10 via-transparent to-transparent" />
                <div className="relative z-10 flex flex-col justify-between p-12">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground">
                            <Code2 className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-2xl font-bold text-primary-foreground">CodeLens AI</span>
                    </Link>

                    <div className="space-y-6">
                        <h1 className="text-4xl font-bold text-primary-foreground text-balance">
                            Forgot your password?
                        </h1>
                        <p className="text-lg text-primary-foreground/80 leading-relaxed">
                            No worries — it happens to the best of us. Enter your email and we'll
                            send you a link to reset your password.
                        </p>
                    </div>

                    <p className="text-sm text-primary-foreground/60">
                        Trusted by 10,000+ developers worldwide
                    </p>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden mb-8 text-center">
                        <Link href="/" className="inline-flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                                <Code2 className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <span className="text-2xl font-bold text-foreground">CodeLens AI</span>
                        </Link>
                    </div>

                    <Card className="border-border bg-card shadow-lg">
                        <CardHeader className="space-y-1 text-center">
                            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                {submitted ? (
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                ) : (
                                    <Mail className="h-6 w-6 text-primary" />
                                )}
                            </div>
                            <CardTitle className="text-2xl font-bold text-card-foreground">
                                {submitted ? "Check your inbox" : "Reset your password"}
                            </CardTitle>
                            <CardDescription className="text-base">
                                {submitted
                                    ? `We sent a reset link to ${email}. It expires in 1 hour.`
                                    : "Enter your account email and we'll send a reset link."}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {!submitted ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Error */}
                                    {error && (
                                        <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label htmlFor="email">Email address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="you@example.com"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    if (error) setError("");
                                                }}
                                                className="pl-10"
                                                autoComplete="email"
                                                autoFocus
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            "Send reset link"
                                        )}
                                    </Button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-600 dark:text-green-400 text-center">
                                        Reset link sent! Check your spam folder if you don't see it.
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setSubmitted(false);
                                            setEmail("");
                                        }}
                                    >
                                        Try a different email
                                    </Button>
                                </div>
                            )}

                            <div className="text-center">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Back to login
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
