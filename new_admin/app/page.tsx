"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        // Check if user is already authenticated
        if (!loading && user) {
            // User is authenticated, redirect to dashboard
            router.push("/dashboard");
        }
    }, [user, loading, router]);

    // If still loading, you could show a loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold">Admin Dashboard</h1>
                    <p className="mt-3 text-lg text-gray-600">
                        Manage your application and users
                    </p>
                </div>

                <div className="mt-8 space-y-4">
                    <div className="flex flex-col space-y-4">
                        <Link href="/login" className="w-full">
                            <Button className="w-full">Login to Dashboard</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
} 