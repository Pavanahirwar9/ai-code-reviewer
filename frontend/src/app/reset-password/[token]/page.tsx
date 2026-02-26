"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code2, Eye, EyeOff, Lock, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function ResetPasswordPage() {
    const params = useParams();
    const router = useRouter();
    const token = params?.token as string;

    const [formData, setFormData] = useState({ password: "", confirm: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<{ password?: string; confirm?: string; general?: string }>({});

    const validate = () => {
        const e: typeof errors = {};
        if (!formData.password) {
            e.password = "Password is required.";
        } else if (formData.password.length < 6) {
            e.password = "Password must be at least 6 characters.";
        }
        if (!formData.confirm) {
            e.confirm = "Please confirm your password.";
        } else if (formData.password !== formData.confirm) {
            e.confirm = "Passwords do not match.";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!token) {
            setErrors({ general: "Reset token is missing. Please request a new link." });
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.resetPassword(token, formData.password);
            if (res.success) {
                // Persist new JWT if returned
                if (res.data?.token && typeof window !== "undefined") {
                    localStorage.setItem("token", res.data.token);
                }
                setSuccess(true);
                toast.success("Password reset successfully!");
                setTimeout(() => router.push("/dashboard"), 2000);
            } else {
                setErrors({ general: res.error || res.message || "Invalid or expired reset link." });
            }
        } catch {
            setErrors({ general: "Something went wrong. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    const passwordStrength = (): { label: string; color: string; width: string } => {
        const p = formData.password;
        if (!p) return { label: "", color: "bg-muted", width: "w-0" };
        let score = 0;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
        if (score === 2) return { label: "Fair", color: "bg-yellow-500", width: "w-2/4" };
        if (score === 3) return { label: "Good", color: "bg-blue-500", width: "w-3/4" };
        return { label: "Strong", color: "bg-green-500", width: "w-full" };
    };

    const strength = passwordStrength();

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
                            Create a new password
                        </h1>
                        <p className="text-lg text-primary-foreground/80 leading-relaxed">
                            Choose a strong password to secure your CodeLens AI account.
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
                                {success ? (
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                ) : (
                                    <Lock className="h-6 w-6 text-primary" />
                                )}
                            </div>
                            <CardTitle className="text-2xl font-bold text-card-foreground">
                                {success ? "Password updated!" : "Set new password"}
                            </CardTitle>
                            <CardDescription className="text-base">
                                {success
                                    ? "Your password has been reset. Redirecting to your dashboard..."
                                    : "Enter your new password below."}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {!success ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* General error */}
                                    {errors.general && (
                                        <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            {errors.general}
                                        </div>
                                    )}

                                    {/* Password field */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="password">New password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="At least 6 characters"
                                                value={formData.password}
                                                onChange={(e) => {
                                                    setFormData((d) => ({ ...d, password: e.target.value }));
                                                    if (errors.password) setErrors((er) => ({ ...er, password: undefined }));
                                                }}
                                                className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                                                autoFocus
                                                disabled={isLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {/* Strength bar */}
                                        {formData.password && (
                                            <div className="space-y-1">
                                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Strength: <span className="font-medium">{strength.label}</span>
                                                </p>
                                            </div>
                                        )}
                                        {errors.password && (
                                            <p className="text-sm text-destructive flex items-center gap-1">
                                                <AlertCircle className="h-3.5 w-3.5" /> {errors.password}
                                            </p>
                                        )}
                                    </div>

                                    {/* Confirm password field */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="confirm">Confirm new password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="confirm"
                                                type={showConfirm ? "text" : "password"}
                                                placeholder="Repeat your password"
                                                value={formData.confirm}
                                                onChange={(e) => {
                                                    setFormData((d) => ({ ...d, confirm: e.target.value }));
                                                    if (errors.confirm) setErrors((er) => ({ ...er, confirm: undefined }));
                                                }}
                                                className={`pl-10 pr-10 ${errors.confirm ? "border-destructive" : ""}`}
                                                disabled={isLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                tabIndex={-1}
                                            >
                                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {errors.confirm && (
                                            <p className="text-sm text-destructive flex items-center gap-1">
                                                <AlertCircle className="h-3.5 w-3.5" /> {errors.confirm}
                                            </p>
                                        )}
                                    </div>

                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Resetting...
                                            </>
                                        ) : (
                                            "Reset password"
                                        )}
                                    </Button>
                                </form>
                            ) : (
                                <div className="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-600 dark:text-green-400 text-center">
                                    You are being redirected to your dashboard...
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
