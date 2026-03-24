"use client";
import { useState, useEffect } from "react";
import { apiGet } from "@/services/api";

export default function useLiveCount(endpoint, interval = 15000) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        async function fetchCount() {
            try {
                // If no token, apiGet might fail if endpoint is protected.
                // We attempt anyway as some might be public or allow anon.
                const data = await apiGet(endpoint);

                let val = 0;
                if (typeof data === "number") {
                    val = data;
                } else if (data && typeof data === "object") {
                    val = data.count || data.total || data.value || 0;
                }

                setCount(val);
            } catch (e) {
                // silent fail or console log
                console.warn(`useLiveCount fail for ${endpoint}:`, e);
            }
        }

        fetchCount();
        const id = setInterval(fetchCount, interval);
        return () => clearInterval(id);
    }, [endpoint, interval]);

    return count;
}
