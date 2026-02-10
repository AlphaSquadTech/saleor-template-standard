import { useQuery } from "@apollo/client";
import { useState, useMemo, useCallback } from "react";
import {
  GET_CHANNELS,
  GetChannelsData,
  Warehouse,
} from "@/graphql/queries/getChannels";
import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";

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

interface UserLocation {
  lat: number;
  lng: number;
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

export function useDealerLocations() {
  const { getDealerLocatorToken } = useAppConfiguration();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const dealerToken = getDealerLocatorToken();

  const { data, loading, error } = useQuery<GetChannelsData>(GET_CHANNELS, {
    context: {
      headers: {
        ...(dealerToken && { "Authorization-Bearer": dealerToken }),
      },
    },
  });

  // Process dealer warehouses
  const dealerWarehouses = useMemo(() => {
    if (!data?.channels) return [];

    const dealerChannel = data.channels.find(
      (channel) => channel.slug === "dealers"
    );
    if (!dealerChannel) return [];

    return dealerChannel.warehouses.map((warehouse) => {
      const extendedWarehouse: ExtendedWarehouse = {
        ...warehouse,
        distance: "N/A",
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
        }
      }

      return extendedWarehouse;
    });
  }, [data, userLocation]);

  // Get sorted dealers (by distance if location available)
  const sortedDealers = useMemo(() => {
    if (!userLocation) return dealerWarehouses;

    return [...dealerWarehouses].sort((a, b) => {
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
  }, [dealerWarehouses, userLocation]);

  // Get nearest dealer
  const nearestDealer = useMemo(() => {
    if (!userLocation || sortedDealers.length === 0) return null;

    const dealerWithDistance = sortedDealers.find(
      (dealer) => dealer.distance && dealer.distance !== "N/A"
    );

    return dealerWithDistance || sortedDealers[0];
  }, [sortedDealers, userLocation]);

  // Request user location
  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return Promise.reject(new Error("Geolocation not supported"));
    }

    setIsGettingLocation(true);
    setLocationError(null);

    return new Promise<UserLocation>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          setLocationError(null);
          setIsGettingLocation(false);
          resolve(location);
        },
        (error) => {
          let errorMessage = "Unable to get your location.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location access denied. Please enable location access and try again.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
          }
          setLocationError(errorMessage);
          setIsGettingLocation(false);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, []);

  // Find dealers within a radius
  const findDealersWithinRadius = useCallback(
    (radiusMiles: number) => {
      if (!userLocation) return [];

      return sortedDealers.filter((dealer) => {
        if (!dealer.distance || dealer.distance === "N/A") return false;
        const distance = parseFloat(dealer.distance.split(" ")[0]);
        return distance <= radiusMiles;
      });
    },
    [sortedDealers, userLocation]
  );

  return {
    // Data
    dealerWarehouses,
    sortedDealers,
    nearestDealer,
    userLocation,

    // State
    loading,
    error,
    locationError,
    isGettingLocation,

    // Actions
    requestUserLocation,
    setUserLocation,
    findDealersWithinRadius,

    // Utils
    calculateDistance: (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ) => calculateDistance(lat1, lon1, lat2, lon2),
  };
}
