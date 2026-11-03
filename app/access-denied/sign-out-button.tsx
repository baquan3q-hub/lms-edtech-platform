"use client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
export function SignOutButton() {
  const { signOut, loading } = useAuth();
  return <Button className="w-fit" disabled={loading} onClick={() => void signOut()}>Đăng xuất</Button>;
}
