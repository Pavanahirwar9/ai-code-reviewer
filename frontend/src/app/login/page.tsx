"use client";

import React from "react"

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Code2, Eye, EyeOff, Github, Mail, AlertCircle, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [oauthError, setOauthError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    const err = searchParams.get("error");
    const detail = searchParams.get("detail");
    if (err) {
      const messages: Record<string, string> = {
        google_token_failed: `Google login failed: ${detail || "token exchange error"}`,
        google_no_token: "Google login failed: could not get access token.",
        google_profile_failed: "Google login failed: could not fetch profile.",
        google_failed: `Google login failed${detail ? `: ${detail}` : ". Please try again."}`,
        google_denied: "Google login was cancelled.",
        google_no_code: "Google login failed: no authorisation code received.",
        github_failed: "GitHub login failed. Please try again.",
      };
      setOauthError(messages[err] || `Login error: ${err}`);
    }
  }, [searchParams]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const success = await login(formData.email, formData.password);

      if (success) {
        toast.success("Welcome back! Redirecting to dashboard...");
        router.push("/dashboard");
      } else {
        toast.error("Invalid credentials");
      }
    } catch (error: any) {
      if (error.emailNotVerified) {
        setUnverifiedEmail(error.email || formData.email);
        return;
      }
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const response = await api.resendVerification(unverifiedEmail);
      if (response.success) {
        setResendSent(true);
        toast.success(response.message || "Verification email sent! Check your inbox.");
      } else {
        toast.error(response.error || response.message || "Failed to resend. Please try again.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
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
              Welcome back to smarter code reviews
            </h1>
            <p className="text-lg text-primary-foreground/80 leading-relaxed">
              Continue where you left off. Your AI-powered code analysis dashboard awaits.
            </p>
          </div>

          <p className="text-sm text-primary-foreground/60">
            Trusted by 10,000+ developers worldwide
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
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
              <CardTitle className="text-2xl font-bold text-card-foreground">Log in to your account</CardTitle>
              <CardDescription className="text-base">
                Enter your email and password to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* OAuth error banner */}
              {oauthError && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <p className="font-medium">{oauthError}</p>
                  <p className="mt-1 text-xs opacity-80">Please try again or contact support if the problem persists.</p>
                </div>
              )}
              {/* Email not verified banner */}
              {unverifiedEmail && (
                <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 space-y-2">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                    Your email is not verified yet.
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    Check your inbox for the verification link, or resend it below.
                  </p>
                  {resendSent ? (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verification email sent!
                    </p>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10"
                      disabled={resendLoading}
                      onClick={handleResendVerification}
                    >
                      {resendLoading ? <><RefreshCw className="mr-1 h-3 w-3 animate-spin" />Sending...</> : "Resend verification email"}
                    </Button>
                  )}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      className={`h-12 text-base ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {errors.email && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      </div>
                    )}
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      {errors.email}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll never share your email with anyone else.
                  </p>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      className={`h-12 text-base pr-12 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      {errors.password}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters long.
                  </p>
                </div>

                {/* Remember Me */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => setFormData({ ...formData, rememberMe: checked as boolean })}
                  />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                    Remember me for 30 days
                  </Label>
                </div>

                {/* Submit Button */}
                <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                {/* Social Login */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    type="button"
                    className="h-12 bg-transparent"
                    onClick={() => {
                      window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/github`;
                    }}
                  >
                    <Github className="mr-2 h-5 w-5" />
                    GitHub
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    className="h-12 bg-transparent"
                    onClick={() => {
                      window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google`;
                    }}
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </Button>
                </div>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Sign up for free
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginPageContent />
    </Suspense>
  );
}
