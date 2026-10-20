import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { ArrowIcon } from "@/components/transit/icons";
import { PILL_PRIMARY } from "./data";

/** "Plan my journey": register when signed out, the dashboard when signed in. */
export function usePlanTarget() {
  const { status, user } = useAuth();
  return status === "authenticated" && user !== null ? "/dashboard" : "/register";
}

export default function PlanCta({ className = "" }: { className?: string }) {
  return (
    <Link to={usePlanTarget()} className={`${PILL_PRIMARY} ${className}`}>
      Plan my journey <ArrowIcon size={16} />
    </Link>
  );
}
