"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function GoogleSuccessContent() {
    const router = useRouter();
    const params = useSearchParams();

    useEffect(() => {
        const token = params.get("token");

        if (token) {
            localStorage.setItem("token", token);

            // Fetch user profile so AuthContext can read it on mount
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            fetch(`${apiUrl}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((r) => r.json())
                .then((data) => {
                    if (data?.data) {
                        localStorage.setItem("user", JSON.stringify(data.data));
                    }
                })
                .catch(() => {/* non-fatal */})
                .finally(() => {
                    router.replace("/dashboard");
                });
        } else {
            router.replace("/login?error=google_failed");
        }
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-lg">Signing you in with Google...</p>
            </div>
        </div>
    );
}

export default function GoogleSuccessPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-muted-foreground text-lg">Signing you in with Google...</p>
                </div>
            </div>
        }
        >
            <GoogleSuccessContent />
        </Suspense>
    );
}
