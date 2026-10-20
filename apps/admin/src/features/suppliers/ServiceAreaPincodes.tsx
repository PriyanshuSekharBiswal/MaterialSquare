import { useEffect, useState } from "react";

type PostalOffice = {
  Name: string;
  District: string;
  State: string;
  Pincode: string;
};

type PostalArea = {
  pincode: string;
  offices: PostalOffice[];
};

type PostalApiResponse = {
  Status?: string;
  PostOffice?: PostalOffice[] | null;
}[];

const postalAreaRequests = new Map<string, Promise<PostalArea | null>>();

function getPostalArea(pincode: string): Promise<PostalArea | null> {
  const cached = postalAreaRequests.get(pincode);
  if (cached) return cached;

  const request = fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`, {
    signal: AbortSignal.timeout(15000),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Postal lookup failed: ${response.status}`);
      const result = (await response.json()) as PostalApiResponse;
      const offices = result[0]?.Status === "Success"
        ? (result[0].PostOffice ?? []).filter((office) => office.Pincode === pincode)
        : [];
      return offices.length ? { pincode, offices } : null;
    })
    .catch(() => {
      postalAreaRequests.delete(pincode);
      return null;
    });

  postalAreaRequests.set(pincode, request);
  return request;
}

export default function ServiceAreaPincodes({
  pincodes,
  className,
}: {
  pincodes: string[];
  className?: string;
}) {
  const normalizedPincodes = [...new Set(pincodes.map((pin) => pin.trim()).filter(Boolean))];
  const [areas, setAreas] = useState<Record<string, PostalArea | null>>({});

  useEffect(() => {
    let active = true;
    void Promise.all(normalizedPincodes.map(async (pincode) => {
      if (!/^\d{6}$/.test(pincode)) {
        if (active) setAreas((current) => ({ ...current, [pincode]: null }));
        return;
      }
      const area = await getPostalArea(pincode);
      if (active) setAreas((current) => ({ ...current, [pincode]: area }));
    }));
    return () => { active = false; };
  }, [normalizedPincodes.join(",")]);

  if (!normalizedPincodes.length) return <strong>Not specified</strong>;

  return (
    <div className={className}>
      {normalizedPincodes.map((pincode) => {
        const area = areas[pincode];
        const locations = area?.offices.map((office) => office.Name).filter(Boolean);
        const districts = area?.offices.map((office) => office.District).filter(Boolean);
        const states = area?.offices.map((office) => office.State).filter(Boolean);
        return (
          <div className="bc-service-area-pin" key={pincode}>
            <strong>{pincode}</strong>
            <div>
              {locations?.length ? (
                <>
                  <span><b>Post offices / localities:</b> {[...new Set(locations)].join(", ")}</span>
                  <span><b>District / city:</b> {[...new Set(districts ?? [])].join(", ")}</span>
                  <span><b>State:</b> {[...new Set(states ?? [])].join(", ")}</span>
                </>
              ) : (
                <span>{/^\d{6}$/.test(pincode)
                  ? Object.prototype.hasOwnProperty.call(areas, pincode) ? "Postal locality details unavailable" : "Loading postal localities…"
                  : "Enter a valid 6-digit PIN code"}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
