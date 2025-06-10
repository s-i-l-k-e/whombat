import {
  DescriptionData,
  DescriptionTerm,
} from "@/lib/components/ui/Description";
import { H4 } from "@/lib/components/ui/Headings";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

import { getFrontendConfig } from "@/lib/api/config";
import type { SoundEventAnnotation } from "@/lib/types";

export default function SoundEventAnnotationDetails({
  soundEventAnnotation,
}: {
  soundEventAnnotation: SoundEventAnnotation;
}) {
  const [copied, setCopied] = useState(false);
  const [whombatUrl, setWhombatUrl] = useState<string | null>(null);

  useEffect(() => {
    getFrontendConfig().then((config) => {
      const url = `${config.frontend_url}/sound_event_annotations?uuid=${soundEventAnnotation.uuid}`;
      setWhombatUrl(url);
    }).catch(console.error);
  }, [soundEventAnnotation.uuid]);

  const handleCopyUrl = async () => {
    if (!whombatUrl) return;
    
    try {
      await navigator.clipboard.writeText(whombatUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <H4 className="text-center">Sound Event Details</H4>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col">
          <DescriptionTerm>UUID</DescriptionTerm>
          <DescriptionData>
            {soundEventAnnotation.uuid}
          </DescriptionData>
        </div>
        {whombatUrl && (
          <div className="flex flex-col">
            <DescriptionTerm>Bounding Box URL</DescriptionTerm>
            <DescriptionData>
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-2 py-1 rounded hover:bg-gray-100 transition-colors"
                title="Copy bounding box URL"
              >
                <DocumentDuplicateIcon className="w-4 h-4 text-gray-600" />
                {copied ? (
                  <span className="text-green-600 text-sm">Copied!</span>
                ) : (
                  <span className="text-sm">Click here to copy</span>
                )}
              </button>
            </DescriptionData>
          </div>
        )}
        <div className="flex flex-col">
          <DescriptionTerm>Created By</DescriptionTerm>
          <DescriptionData>
            {soundEventAnnotation.created_by?.name || soundEventAnnotation.created_by?.username || "Unknown"}
          </DescriptionData>
        </div>
        <div className="flex flex-col">
          <DescriptionTerm>Created On</DescriptionTerm>
          <DescriptionData>
            {soundEventAnnotation.created_on.toLocaleString()}
          </DescriptionData>
        </div>
        <div className="flex flex-col">
          <DescriptionTerm>Geometry Type</DescriptionTerm>
          <DescriptionData>
            {soundEventAnnotation.sound_event.geometry_type}
          </DescriptionData>
        </div>
        {soundEventAnnotation.sound_event.features?.map((feature) => (
          <div key={feature.name} className="flex flex-col">
            <DescriptionTerm>{feature.name}</DescriptionTerm>
            <DescriptionData>{feature.value.toLocaleString()}</DescriptionData>
          </div>
        ))}
      </div>
    </div>
  );
}
