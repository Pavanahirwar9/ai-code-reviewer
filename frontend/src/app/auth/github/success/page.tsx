"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function GitHubSuccessContent() {
    const router = useRouter();
    const params = useSearchParams();

    useEffect(() => {
        const token = params.get("token");

        if (token) {
            // Save token first
            localStorage.setItem("token", token);

            // Fetch user data so AuthContext can read it on mount
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
                .catch(() => {/* non-fatal */ })
                .finally(() => {
                    // Redirect to GitHub dashboard page
                    router.replace("/dashboard/github?connected=true");
                });
        } else {
            router.replace("/login?error=github_failed");
        }
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-lg">Connecting your GitHub account...</p>
            </div>
        </div>
    );
}

export default function GitHubSuccessPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-muted-foreground text-lg">Connecting your GitHub account...</p>
                </div>
            </div>
        }
        >
            <GitHubSuccessContent />
        </Suspense>
    );
}
