"use client";

import { useQuery } from "@apollo/client";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  GET_CHANNELS,
  GetChannelsData,
  Warehouse,
} from "@/graphql/queries/getChannels";
import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";
import EmptyState from "@/app/components/reuseableUI/emptyState";
import { SearchIcon } from "@/app/utils/svgs/searchIcon";
import ReactPaginate from "react-paginate";
import { ChevronDownIcon } from "@/app/utils/svgs/chevronDownIcon";

interface ExtendedWarehouse extends Warehouse {
  distance?: string;
  phone?: string;
  website?: string;
  latitude?: string;
  longitude?: string;
  hours?: string;
  comments?: string;
  pocFirstName?: string;
  pocLastName?: string;
  state?: string;
}

// Distance calculation utility function (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance filter options
const distanceOptions = [
  { value: "", label: "Any Distance" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
  { value: "250", label: "Within 250 miles" },
  { value: "500", label: "Within 500 miles" },
  { value: "1000", label: "Within 1000 miles" },
];

export default function StoreLocator() {
  const { getGoogleMapsConfig, getDealerLocatorToken } = useAppConfiguration();
  const dealerToken = getDealerLocatorToken();

  const { data, loading, error } = useQuery<GetChannelsData>(GET_CHANNELS, {
    context: {
      headers: {
        ...(dealerToken && { "Authorization-Bearer": dealerToken }),
      },
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedDistance, setSelectedDistance] = useState("");
  const [getDistanceValue, setGetDistanceValue] = useState(
    "Please enable your location"
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const dealerWarehouses = useMemo(() => {
    if (!data?.channels) return [];

    const dealerChannel = data.channels.find(
      (channel) => channel.slug === "dealers"
    );
    if (!dealerChannel) return [];

    return dealerChannel.warehouses.map((warehouse) => {
      const extendedWarehouse: ExtendedWarehouse = {
        ...warehouse,
        distance: "Please enable your location",
        phone: warehouse?.address?.phone || "",
        website: "",
        latitude: "",
        longitude: "",
        hours: "",
        comments: "",
        pocFirstName: "",
        pocLastName: "",
        state: "",
      };
      // Extract additional data from privateMetadata
      warehouse.privateMetadata?.forEach((meta) => {
        switch (meta.key) {
          case "lat":
            extendedWarehouse.latitude = meta.value;
            break;
          case "lng":
            extendedWarehouse.longitude = meta.value;
            break;
          case "url":
            extendedWarehouse.website = meta.value;
            break;
          case "hours":
            extendedWarehouse.hours = meta.value;
            break;
          case "comments":
            extendedWarehouse.comments = meta.value;
            break;
          case "poc_firstname":
            extendedWarehouse.pocFirstName = meta.value;
            break;
          case "poc_lastname":
            extendedWarehouse.pocLastName = meta.value;
            break;
          case "state":
            extendedWarehouse.state = meta.value;
            break;
        }
      });

      // Calculate distance if user location and warehouse coordinates are available
      if (
        userLocation &&
        extendedWarehouse.latitude &&
        extendedWarehouse.longitude &&
        extendedWarehouse.latitude !== "null" &&
        extendedWarehouse.longitude !== "null"
      ) {
        const warehouseLat = parseFloat(extendedWarehouse.latitude);
        const warehouseLng = parseFloat(extendedWarehouse.longitude);
        if (!isNaN(warehouseLat) && !isNaN(warehouseLng)) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            warehouseLat,
            warehouseLng
          );
          extendedWarehouse.distance = `${distance.toFixed(1)} miles`;
          setGetDistanceValue(`${distance.toFixed(1)} miles`);
        }
      }

      return extendedWarehouse;
    });
  }, [data, userLocation]);

  // Get unique countries for dropdown
  const availableCountries = useMemo(() => {
    const countries = dealerWarehouses
      .map((w) => w.address?.country?.country)
      .filter(
        (country, index, arr) => country && arr.indexOf(country) === index
      )
      .sort();
    return [
      { value: "", label: "All Countries" },
      ...countries.map((country) => ({ value: country, label: country })),
    ];
  }, [dealerWarehouses]);

  const filteredWarehouses = useMemo(() => {
    let filtered = dealerWarehouses;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (warehouse) =>
          warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          warehouse.address?.city
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          warehouse.address?.streetAddress1
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Filter by country
    if (selectedCountry) {
      filtered = filtered.filter(
        (warehouse) => warehouse.address?.country?.country === selectedCountry
      );
    }

    // Filter by distance
    if (selectedDistance && userLocation) {
      const maxDistance = parseFloat(selectedDistance);
      filtered = filtered.filter((warehouse) => {
        if (
          !warehouse.latitude ||
          !warehouse.longitude ||
          warehouse.latitude === "null" ||
          warehouse.longitude === "null"
        ) {
          return false;
        }
        const warehouseLat = parseFloat(warehouse.latitude);
        const warehouseLng = parseFloat(warehouse.longitude);
        if (isNaN(warehouseLat) || isNaN(warehouseLng)) {
          return false;
        }
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          warehouseLat,
          warehouseLng
        );
        return distance <= maxDistance;
      });
    }

    // Sort by distance if user location is available
    if (userLocation) {
      filtered = filtered.sort((a, b) => {
        const distanceA =
          a.distance && a.distance !== "N/A"
            ? parseFloat(a.distance.split(" ")[0])
            : Infinity;
        const distanceB =
          b.distance && b.distance !== "N/A"
            ? parseFloat(b.distance.split(" ")[0])
            : Infinity;
        return distanceA - distanceB;
      });
    }

    return filtered;
  }, [
    dealerWarehouses,
    searchTerm,
    selectedCountry,
    selectedDistance,
    userLocation,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCountry, selectedDistance, userLocation]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredWarehouses.length / pageSize)
  );

  const paginatedWarehouses = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredWarehouses.slice(startIndex, startIndex + pageSize);
  }, [filteredWarehouses, currentPage, pageSize]);

  const handlePageChange = ({ selected }: { selected: number }) => {
    const targetPage = selected + 1;
    setCurrentPage(targetPage);

    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // Load Google Maps
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google) {
        setMapLoaded(true);
        return;
      }

      // Check if Google Maps script is already being loaded
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com/maps/api/js"]'
      ) as HTMLScriptElement;
      if (existingScript) {
        // If script exists, wait for it to load
        existingScript.addEventListener("load", () => setMapLoaded(true));
        existingScript.addEventListener("error", () =>
          setMapError("Failed to load Google Maps. Please check your API key.")
        );
        return;
      }

      const mapsConfig = getGoogleMapsConfig();
      const apiKey = mapsConfig?.api_key;

      if (!apiKey) {
        setMapError(
          "Google Maps API key is required. Please check your app configuration."
        );
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () =>
        setMapError("Failed to load Google Maps. Please check your API key.");
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [getGoogleMapsConfig]);

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    // Clear the map container to prevent duplicate maps
    if (mapRef.current && mapRef.current.innerHTML) {
      mapRef.current.innerHTML = "";
    }

    // Default center (US center)
    let defaultCenter = { lat: 39.8283, lng: -98.5795 };
    let defaultZoom = 5;

    // If we have warehouses with coordinates, use the first valid one
    const warehouseWithCoords = filteredWarehouses.find(
      (w) =>
        w.latitude &&
        w.longitude &&
        w.latitude !== "null" &&
        w.longitude !== "null"
    );

    if (warehouseWithCoords) {
      defaultCenter = {
        lat: parseFloat(warehouseWithCoords.latitude!),
        lng: parseFloat(warehouseWithCoords.longitude!),
      };
      defaultZoom = filteredWarehouses.length === 1 ? 12 : 8;
    }

    // If user location is available, center on user
    if (userLocation) {
      defaultCenter = userLocation;
      defaultZoom = 10;
    }

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: defaultZoom,
      center: defaultCenter,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      minZoom: 3,
      maxZoom: 18,
      gestureHandling: "greedy",
      restriction: {
        latLngBounds: {
          north: 85,
          south: -85,
          west: -180,
          east: 180,
        },
        strictBounds: true,
      },
      draggableCursor: "default",
    });

    // Store map instance
    mapInstanceRef.current = map;

    // Enforce zoom limits to prevent world wrapping visibility
    window.google.maps.event.addListener(map, "zoom_changed", function () {
      const zoom = map.getZoom();
      if (zoom !== undefined && zoom < 3) {
        map.setZoom(3);
      }
    });

    const bounds = new window.google.maps.LatLngBounds();
    let validMarkers = 0;

    // Add user location marker if available
    if (userLocation) {
      new window.google.maps.Marker({
        position: userLocation,
        map: map,
        title: "Your Location",
        icon: {
          url:
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#FFFFFF"/></svg>'
            ),
          scaledSize: new window.google.maps.Size(24, 24),
        },
      });
      bounds.extend(userLocation);
    }

    filteredWarehouses.forEach((warehouse) => {
      if (
        warehouse.latitude &&
        warehouse.longitude &&
        warehouse.latitude !== "null" &&
        warehouse.longitude !== "null"
      ) {
        const lat = parseFloat(warehouse.latitude);
        const lng = parseFloat(warehouse.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: map,
            title: warehouse.name,
            icon: {
              url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(
                  '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#DC2626" stroke="#FFFFFF" stroke-width="1"/></svg>'
                ),
              scaledSize: new window.google.maps.Size(32, 32),
            },
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div class="p-3 max-w-xs">
                <h3 class="font-semibold text-lg mb-2">${warehouse.name}</h3>
                <p class="text-sm text-gray-600 mb-1">${
                  warehouse.address?.streetAddress1 || ""
                }</p>
                <p class="text-sm text-gray-600 mb-2">${
                  warehouse.address?.city || ""
                }, ${
              warehouse.state || warehouse.address?.country?.code || ""
            } ${warehouse.address?.postalCode || ""}</p>
                ${
                  warehouse.phone && warehouse.phone !== "null"
                    ? `<p class="text-sm mb-1"><strong>Phone:</strong> ${warehouse.phone}</p>`
                    : ""
                }
                ${
                  warehouse.hours && warehouse.hours !== "null"
                    ? `<p class="text-sm mb-1"><strong>Hours:</strong> ${warehouse.hours}</p>`
                    : ""
                }
                ${
                  warehouse.website && warehouse.website !== "null"
                    ? `<p class="text-sm"><a href="${warehouse.website}" target="_blank" class="text-blue-600 hover:underline font-medium">Visit Website</a></p>`
                    : ""
                }
                ${
                  warehouse.distance && warehouse.distance !== "N/A"
                    ? `<p class="text-sm text-green-600 font-medium mt-2">Distance: ${warehouse.distance}</p>`
                    : ""
                }
              </div>
            `,
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });

          bounds.extend({ lat, lng });
          validMarkers++;
        }
      }
    });

    // Fit bounds if we have multiple points or auto-fit for better view
    if (validMarkers > 0 && (userLocation || validMarkers > 1)) {
      map.fitBounds(bounds);
      // Set zoom level constraints to avoid zooming too close or too far
      const listener = window.google.maps.event.addListener(
        map,
        "bounds_changed",
        () => {
          const zoom = map.getZoom();
          if (zoom !== undefined) {
            // Prevent zooming too close
            if (zoom > 15) {
              map.setZoom(15);
            }
            // Prevent zooming too far out (where world wrapping is visible)
            if (zoom < 3) {
              map.setZoom(3);
            }
          }
          window.google.maps.event.removeListener(listener);
        }
      );
    }

    // Cleanup function to clear map when dependencies change
    return () => {
      if (mapRef.current) {
        mapRef.current.innerHTML = "";
      }
      mapInstanceRef.current = null;
    };
  }, [mapLoaded, filteredWarehouses, userLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="animate-spin rounded-full size-12 border-b-2 border-[var(--color-secondary-800)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mt-10">
          <EmptyState
            text="Unable to load dealer locations"
            textParagraph="Please check your connection and try again."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5">
        {userLocation && (
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--color-primary-600)" }}
          >
            ✓ Using your location for distance calculations
          </div>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="mt-10 mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64 relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, city, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-sm border border-[var(--color-secondary-300)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-600)] text-[var(--color-secondary-900)] placeholder-[var(--color-secondary-500)]"
              />

              {/* Search icon */}
              <div className="absolute left-3 top-2.5">
                <span className="w-4 h-4 block text-[var(--color-secondary-600)]">
                  {SearchIcon}
                </span>
              </div>

              {/* Clear button */}
              {searchTerm && (
                <div className="absolute right-3 top-3">
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="text-[var(--color-secondary-400)] cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      fill="none"
                    >
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-4 py-2 h-10 text-sm border border-[var(--color-secondary-300)] cursor-pointer bg-[var(--color-secondary-50)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-600)] text-[var(--color-secondary-900)]"
          >
            {availableCountries.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>

          <select
            value={selectedDistance}
            onChange={(e) => setSelectedDistance(e.target.value)}
            className={`px-4 py-2 h-10 text-sm border border-[var(--color-secondary-300)] cursor-pointer bg-[var(--color-secondary-50)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-600)] text-[var(--color-secondary-900)] ${
              getDistanceValue === "Please enable your location"
                ? "opacity-50 pointer-events-none"
                : ""
            }`}
          >
            {distanceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setUserLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                    });
                  },
                  (error) => {
                    console.error("Error getting location:", error);
                    alert(
                      "Unable to get your location. Please check your browser settings."
                    );
                  }
                );
              } else {
                alert("Geolocation is not supported by this browser.");
              }
            }}
            className="px-4 py-2 text-black cursor-pointer focus:outline-none focus:ring-2 transition-colors whitespace-nowrap flex items-center gap-2"
            style={{
              backgroundColor: "var(--color-primary-600)",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor =
                "var(--color-primary-700)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor =
                "var(--color-primary-600)";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            Use My Location
          </button>
        </div>
      </div>

      {/* Google Map */}
      <div className="mb-6 overflow-hidden">
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg overflow-hidden"
          style={{
            backgroundColor: "var(--color-secondary-200)",
            minHeight: "400px",
            maxWidth: "100%",
            position: "relative",
          }}
        >
          {mapError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-4">
                <div
                  className="font-semibold mb-2"
                  style={{ color: "var(--color-primary-600)" }}
                >
                  ⚠️ Map Error
                </div>
                <div
                  className="text-sm"
                  style={{ color: "var(--color-secondary-600)" }}
                >
                  {mapError}
                </div>
                <div
                  className="text-xs mt-2"
                  style={{ color: "var(--color-secondary-500)" }}
                >
                  Get your API key from: <br />
                  <a
                    href="https://developers.google.com/maps/documentation/javascript/get-api-key"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: "var(--color-primary-600)" }}
                  >
                    developers.google.com/maps/documentation/javascript/get-api-key
                  </a>
                </div>
              </div>
            </div>
          ) : !mapLoaded ? (
            <div className="flex items-center justify-center h-full">
              <div style={{ color: "var(--color-secondary-500)" }}>
                Loading map...
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {filteredWarehouses.length === 0 ? (
        <EmptyState
          text="No dealers found"
          textParagraph={
            searchTerm
              ? `No results found for "${searchTerm}". Try adjusting your search criteria.`
              : "No dealers are currently available in your area."
          }
        />
      ) : (
        <>
          <div
            className="border overflow-hidden"
            style={{
              backgroundColor: "var(--color-secondary-50)",
              borderColor: "var(--color-secondary-200)",
            }}
          >
            <table className="w-full border-collapse">
              <thead
                className="text-white"
                style={{ backgroundColor: "var(--color-secondary-600)" }}
              >
                <tr>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium border-r"
                    style={{ borderColor: "var(--color-secondary-500)" }}
                  >
                    Name
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium border-r"
                    style={{ borderColor: "var(--color-secondary-500)" }}
                  >
                    Distance
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: "var(--color-secondary-200)" }}
              >
                {paginatedWarehouses.map((warehouse) => (
                  <tr
                    key={warehouse.id}
                    className="hover:bg-opacity-50"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--color-secondary-100)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td
                      className="px-4 py-3 border-r"
                      style={{ borderColor: "var(--color-secondary-200)" }}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3 mt-1">
                          <div
                            className="w-6 h-6 flex items-center justify-center rounded-full"
                            style={{
                              backgroundColor: "var(--color-primary-500)",
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                                fill="white"
                              />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <div
                            className="text-sm font-medium mb-1"
                            style={{ color: "var(--color-secondary-900)" }}
                          >
                            {warehouse.name}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--color-secondary-600)" }}
                          >
                            {warehouse.email || "No email available"}
                          </div>
                          {warehouse.website &&
                            warehouse.website !== "null" && (
                              <div className="text-xs mt-1">
                                <span
                                  style={{
                                    color: "var(--color-secondary-600)",
                                  }}
                                >
                                  Website:{" "}
                                </span>
                                <a
                                  href={warehouse.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  {warehouse.website}
                                </a>
                              </div>
                            )}
                          {warehouse.phone && warehouse.phone !== "null" && (
                            <div
                              className="text-xs"
                              style={{ color: "var(--color-secondary-600)" }}
                            >
                              Phone: {warehouse.phone}
                            </div>
                          )}
                          {warehouse.hours && warehouse.hours !== "null" && (
                            <div
                              className="text-xs"
                              style={{ color: "var(--color-secondary-600)" }}
                            >
                              Hours: {warehouse.hours}
                            </div>
                          )}
                          {(warehouse.pocFirstName &&
                            warehouse.pocFirstName !== "null") ||
                          (warehouse.pocLastName &&
                            warehouse.pocLastName !== "null") ? (
                            <div
                              className="text-xs"
                              style={{ color: "var(--color-secondary-600)" }}
                            >
                              Contact:{" "}
                              {warehouse.pocFirstName !== "null"
                                ? warehouse.pocFirstName
                                : ""}{" "}
                              {warehouse.pocLastName !== "null"
                                ? warehouse.pocLastName
                                : ""}
                            </div>
                          ) : null}
                          {warehouse.comments &&
                            warehouse.comments !== "null" && (
                              <div
                                className="text-xs italic"
                                style={{ color: "var(--color-primary-600)" }}
                              >
                                {warehouse.comments}
                              </div>
                            )}
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-sm border-r"
                      style={{
                        color: "var(--color-secondary-900)",
                        borderColor: "var(--color-secondary-200)",
                      }}
                    >
                      {warehouse.distance || "N/A"}
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "var(--color-secondary-600)" }}
                    >
                      <div className="leading-tight">
                        {warehouse.address?.streetAddress1}
                        {warehouse.address?.streetAddress2 &&
                          warehouse.address.streetAddress2.trim() !== "" && (
                            <>
                              <br />
                              {warehouse.address.streetAddress2}
                            </>
                          )}
                        <br />
                        {warehouse.address?.city},{" "}
                        {warehouse.state || warehouse.address?.country?.code}{" "}
                        {warehouse.address?.postalCode}
                        <br />
                        {warehouse.address?.country?.country}
                        {warehouse.latitude &&
                          warehouse.longitude &&
                          warehouse.latitude !== "null" &&
                          warehouse.longitude !== "null" && (
                            <>
                              <br />
                              <span
                                className="text-xs"
                                style={{ color: "var(--color-secondary-500)" }}
                              >
                                Coordinates: {warehouse.latitude},{" "}
                                {warehouse.longitude}
                              </span>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredWarehouses.length > pageSize && (
            <div className="mt-6 flex justify-center">
              <ReactPaginate
                pageCount={totalPages}
                forcePage={Math.max(
                  0,
                  Math.min(totalPages - 1, currentPage - 1)
                )}
                onPageChange={handlePageChange}
                marginPagesDisplayed={1}
                pageRangeDisplayed={2}
                previousLabel={
                  <p className="flex items-center gap-1">
                    <span className="size-5 text-black rotate-90">
                      {ChevronDownIcon}
                    </span>
                    Prev
                  </p>
                }
                nextLabel={
                  <p className="flex items-center gap-1 !text-[var(--color-secondary-600)] font-semibold">
                    Next
                    <span className="size-5 -rotate-90">{ChevronDownIcon}</span>
                  </p>
                }
                renderOnZeroPageCount={undefined}
                containerClassName="flex items-center justify-center gap-2 font-secondary"
                pageClassName="list-none"
                pageLinkClassName="px-3 py-2 !text-base bg-[var(--color-secondary-200)] text-gray-900 hover:opacity-80"
                previousClassName="list-none"
                previousLinkClassName="px-3 py-2 !text-base bg-[var(--color-secondary-200)] text-gray-700 hover:opacity-80 flex items-center gap-1"
                nextClassName="list-none"
                nextLinkClassName="px-3 py-2 !text-base bg-[var(--color-secondary-200)] text-gray-700 hover:opacity-80 flex items-center gap-1"
                activeClassName="list-none"
                activeLinkClassName="px-3 py-2 !text-base !bg-[var(--color-primary-600)] text-white border border-[var(--color-primary-600)]"
                disabledClassName="opacity-50 pointer-events-none"
                breakLabel={"..."}
                breakLinkClassName="px-2 !text-base text-gray-500"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
