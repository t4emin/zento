"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-client";

export default function TablesLauncher() {
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTables() {
      setIsLoading(true);
      setLoadMessage("");

      try {
        const response = await fetch("/api/tables?restaurantSlug=demo", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Failed to load tables API"));
        }

        if (!isMounted) {
          return;
        }

        setRestaurant(payload.restaurant);
        setTables(payload.tables);
        setLoadMessage("Loaded demo tables from the backend API.");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRestaurant(null);
        setTables([]);
        setLoadMessage(error.message || "Unable to load demo tables from the backend API.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTables();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="z-dashboard-home">
      <div className="z-dashboard-home-hero z-card">
        <p className="z-dashboard-kicker">Tables</p>
        <h1>Open demo customer tables</h1>
        <p className="z-dashboard-copy">
          Use these links to test the customer ordering flow quickly from the admin side.
        </p>
      </div>

      {isLoading ? <p className="z-dashboard-notice">Loading demo tables...</p> : null}
      {!isLoading && loadMessage ? (
        <p className="z-dashboard-notice">{loadMessage}</p>
      ) : null}

      <div className="z-dashboard-card-grid">
        {tables.map((table) => (
          <Link
            key={table.code}
            href={`/r/${restaurant?.slug || "demo"}/table/${table.code}`}
            className="z-dashboard-link-card z-card"
          >
            <p className="z-dashboard-card-label">Demo Table</p>
            <h2>{table.code}</h2>
            <p>Open the customer menu for {restaurant?.name || "Zento Demo Restaurant"}.</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
