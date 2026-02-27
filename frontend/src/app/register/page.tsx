"use client";

import React from "react"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Code2, Eye, EyeOff, Github, Mail, AlertCircle, Loader2, Check, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; terms?: string }>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    acceptTerms: false,
  });

  const passwordStrength = {
    hasMinLength: formData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
  };

  const strengthScore = Object.values(passwordStrength).filter(Boolean).length;

  const validateForm = () => {
    const newErrors: { name?: string; email?: string; password?: string; terms?: string } = {};

    if (!formData.name) {
      newErrors.name = "Full name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.acceptTerms) {
      newErrors.terms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const success = await registerUser(
        formData.name,
        formData.email,
        formData.password
      );

      if (success) {
        toast.success("Account created successfully! Welcome to CodeLens AI.");
        router.push("/dashboard");
      } else {
        toast.error("Registration failed");
      }
    } catch (error: any) {
      if (error.needsVerification) {
        setRegisteredEmail(error.email || formData.email);
        setEmailDeliveryFailed(!!error.emailDeliveryFailed);
        setEmailSent(true);
        return;
      }
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
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
              Start your journey to better code
            </h1>
            <p className="text-lg text-primary-foreground/80 leading-relaxed">
              Join thousands of developers who use CodeLens AI to write cleaner, safer, and more efficient code.
            </p>
            <ul className="space-y-3">
              {["Free to get started", "No credit card required", "5 free code reviews/month"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-primary-foreground/80">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-primary-foreground/60">
            Trusted by 10,000+ developers worldwide
          </p>
        </div>
      </div>

      {/* Right side - Registration Form */}
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
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                {emailSent ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Code2 className="h-6 w-6 text-primary" />}
              </div>
              <CardTitle className="text-2xl font-bold text-card-foreground">
                {emailSent ? "Check your inbox!" : "Create your account"}
              </CardTitle>
              <CardDescription className="text-base">
                {emailSent
                  ? emailDeliveryFailed
                    ? `Account created for ${registeredEmail}`
                    : `We sent a verification link to ${registeredEmail}`
                  : "Get started with your free account today"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailSent ? (
                <div className="space-y-4">
                  <div className={`rounded-md border px-4 py-3 text-sm text-center ${
                    emailDeliveryFailed
                      ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400"
                      : "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                  }`}>
                    {emailDeliveryFailed
                      ? "Verification email was not delivered yet. Please click resend below after checking email settings."
                      : "Click the link in the email to activate your account. Check spam if you don&apos;t see it."}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={resendLoading}
                    onClick={async () => {
                      setResendLoading(true);
                      try {
                        const response = await api.resendVerification(registeredEmail);
                        if (response.success) {
                          setEmailDeliveryFailed(false);
                          toast.success(response.message || "Verification email resent!");
                        } else {
                          toast.error(response.error || response.message || "Failed to resend. Try again.");
                        }
                      } catch (err: any) {
                        toast.error(err.message || "Failed to resend. Try again.");
                      } finally {
                        setResendLoading(false);
                      }
                    }}
                  >
                    {resendLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Resend verification email"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Already verified?{" "}
                    <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
                  </p>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name Field */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-foreground">
                        Full Name
                      </Label>
                      <div className="relative">
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value });
                            if (errors.name) setErrors({ ...errors, name: undefined });
                          }}
                          className={`h-12 text-base ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        {errors.name && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                          </div>
                        )}
                      </div>
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        This is how we&apos;ll address you in the app.
                      </p>
                    </div>

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
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        We&apos;ll send you important updates here.
                      </p>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-foreground">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password"
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
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}

                      {/* Password Strength Indicator */}
                      {formData.password && (
                        <div className="space-y-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${strengthScore >= level
                                  ? strengthScore <= 1
                                    ? "bg-destructive"
                                    : strengthScore <= 2
                                      ? "bg-warning"
                                      : "bg-success"
                                  : "bg-muted"
                                  }`}
                              />
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className={`flex items-center gap-1 ${passwordStrength.hasMinLength ? "text-success" : "text-muted-foreground"}`}>
                              {passwordStrength.hasMinLength ? <Check className="h-3 w-3" /> : <span className="h-3 w-3" />}
                              8+ characters
                            </div>
                            <div className={`flex items-center gap-1 ${passwordStrength.hasUppercase ? "text-success" : "text-muted-foreground"}`}>
                              {passwordStrength.hasUppercase ? <Check className="h-3 w-3" /> : <span className="h-3 w-3" />}
                              Uppercase letter
                            </div>
                            <div className={`flex items-center gap-1 ${passwordStrength.hasLowercase ? "text-success" : "text-muted-foreground"}`}>
                              {passwordStrength.hasLowercase ? <Check className="h-3 w-3" /> : <span className="h-3 w-3" />}
                              Lowercase letter
                            </div>
                            <div className={`flex items-center gap-1 ${passwordStrength.hasNumber ? "text-success" : "text-muted-foreground"}`}>
                              {passwordStrength.hasNumber ? <Check className="h-3 w-3" /> : <span className="h-3 w-3" />}
                              Number
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Terms and Conditions */}
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="terms"
                          checked={formData.acceptTerms}
                          onCheckedChange={(checked) => {
                            setFormData({ ...formData, acceptTerms: checked as boolean });
                            if (errors.terms) setErrors({ ...errors, terms: undefined });
                          }}
                          className="mt-1"
                        />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                          I agree to the{" "}
                          <Link href="#" className="text-primary hover:underline">Terms of Service</Link>
                          {" "}and{" "}
                          <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
                        </Label>
                      </div>
                      {errors.terms && (
                        <p className="text-sm text-destructive">{errors.terms}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create account"
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
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </Button>
                    </div>
                  </form>

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </>
              )} {/* end emailSent ternary */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
